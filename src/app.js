import {getAdapter} from './adapters/index.js';
import {connectSourceBridge,fetchSourcePage} from './bridge.js';
import {normalizeChapter,normalizeChapters,createNovelSession} from './core/model.js';
import {selectAll,selectRange,getSelectedChapters} from './core/selection.js';
import {validateChapters} from './core/validation.js';
import {sessionStore} from './core/state.js';
import {downloadTxt} from './exporters/txt.js';
import {downloadDocx} from './exporters/docx.js';
import {downloadEpub} from './exporters/epub.js';
const $=s=>document.querySelector(s);
let sourceDoc=null,sourceUrl='',directory=[],chapters=[],novel=null,errors=[];
let extractionRunning=false, extractionPaused=false, pauseWaiters=[];
let activeAdapter = null;
function setPaused(value){extractionPaused=value;$('#pause-extract').textContent=value?'Resume':'Pause';$('#progress-text').textContent=value?'Paused after the current chapter.':'Resuming extraction…';if(!value){pauseWaiters.splice(0).forEach(resolve=>resolve());}}
async function waitIfPaused(){if(!extractionPaused)return;await new Promise(resolve=>pauseWaiters.push(resolve));}
function persistChapters(){if(sessionStore.get())sessionStore.update(s=>({...s,chapters}));}
function updateExtractionButtons(){
  $('#pause-extract').disabled = !extractionRunning;
  $('#retry-failed').disabled = extractionRunning || !sourceDoc || !chapters.some(c => c.status === 'error');
  $('#extract').disabled = extractionRunning || !sourceDoc || !chapters.some(c => c.status === 'discovered' && c.selected);
  $('#clear').disabled = extractionRunning;
  $('#close-scraper').disabled = extractionRunning;
}
function status(message){$('#status').textContent=message;}
function parse(html){return new DOMParser().parseFromString(html,'text/html');}
function render(){
  $('#count').textContent=String(chapters.length);$('#chapters').replaceChildren();
  if(!chapters.length){$('#chapters').textContent='No chapters discovered yet.';}
  chapters.forEach((ch,i)=>{
    const row=document.createElement('label');row.className='chapter';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=ch.selected;cb.dataset.index=String(i);cb.addEventListener('change',()=>{chapters[i].selected=cb.checked;persistChapters();updateExport();});
    const info=document.createElement('span');info.className='chapter-info';
    const title=document.createElement('span');title.textContent=`${ch.number??'—'}. ${ch.title}`;info.append(title);
    const meta=document.createElement('small');meta.textContent=ch.status==='error'?`Error: ${ch.error}`:ch.status==='extracted'?`${ch.wordCount} words${ch.short?' · Short chapter':''}`:'Not extracted';info.append(meta);row.append(cb,info);$('#chapters').append(row);
  });updateExport();
}
function updateExport(){
  const ready=getSelectedChapters(chapters).some(c=>c.text);
  const formats=activeAdapter?.exportFormats||['txt','docx','epub'];

  $('#export-txt').hidden=!formats.includes('txt');
  $('#export-docx').hidden=!formats.includes('docx');
  $('#export-epub').hidden=!formats.includes('epub');

  $('#export-txt').disabled=!ready;
  $('#export-docx').disabled=!ready;
  $('#export-epub').disabled=!ready||!formats.includes('epub');

  renderValidation();
}
function renderValidation(){const box=$('#validation');if(!chapters.length){box.hidden=true;return;}const report=validateChapters(chapters);box.hidden=false;box.replaceChildren();const heading=document.createElement('h3');heading.textContent=`Validation: ${report.counts.errors} error(s), ${report.counts.warnings} warning(s), ${report.counts.info} pending`;box.append(heading);if(!report.issues.length){const ok=document.createElement('p');ok.className='hint';ok.textContent='No issues detected.';box.append(ok);return;}const list=document.createElement('ul');report.issues.forEach(issue=>{const item=document.createElement('li');item.className=issue.severity;item.textContent=issue.message;list.append(item);});box.append(list);}
function updateNovelCard(){ $('#novel-card').hidden=!novel; if(!novel)return;$('#novel-title').textContent=novel.title||'—';$('#novel-author').textContent=novel.author||'—';$('#novel-total').textContent=String(directory.length);$('#novel-description').textContent=novel.description||''; }
connectSourceBridge(({html,url})=>{sourceDoc=parse(html);sourceUrl=new URL(url).href;$('#source-url').value=sourceUrl;$('#source-badge').textContent=new URL(url).hostname;status(sessionStore.get()?'Source reconnected. Your saved session is still available.':'Connected to source page. Ready to inspect.');updateExtractionButtons();});
async function fetchDocument(url){const result=await fetchSourcePage(url);return parse(result.html);}
async function inspect() {
  if (!sourceDoc || !sourceUrl) {
    status('No source-page connection. Launch the bookmarklet from the novel page.');
    return;
  }

  activeAdapter = getAdapter(sourceUrl);

  if (!activeAdapter || activeAdapter.id === 'generic-html') {
    status('This website is not supported yet.');
    return;
  }

  try {
    const result = activeAdapter.inspect(sourceDoc, sourceUrl);

    if (result.kind === 'unknown') {
      throw new Error('Could not identify the novel directory or chapter page.');
    }

    novel = {
      title: result.title,
      author: result.author,
      description: result.description,
      sourceUrl,
      sourceId: new URL(sourceUrl).pathname
    };

    directory = [...result.chapters];
    // Follow additional directory pages supplied by the adapter.
const queuedPages=[...(result.directoryPages||[])];
const visitedPages=new Set([new URL(sourceUrl).href]);

while(queuedPages.length && visitedPages.size<100){
  const page=queuedPages.shift();
  const pageUrl=new URL(page.url,sourceUrl).href;

  if(visitedPages.has(pageUrl)||new URL(pageUrl).origin!==new URL(sourceUrl).origin) continue;

  visitedPages.add(pageUrl);

  const pageDoc=await fetchDocument(pageUrl);
  const pageResult=activeAdapter.inspect(pageDoc,pageUrl);

  if(pageResult.kind==='directory') directory.push(...pageResult.chapters);

  for(const next of pageResult.directoryPages||[]) queuedPages.push(next);
}

directory=[...new Map(directory.map(item=>[item.url,item])).values()];

    const previous = sessionStore.get();

    const sameNovel = previous &&
      previous.sourceUrl === sourceUrl;

    if (result.kind === 'chapter' && result.chapter) {
      const prior = sameNovel
        ? previous.chapters.find(c => c.url === result.chapter.url)
        : null;

      chapters = [
        normalizeChapter(
          prior || {
            ...result.chapter,
            selected: !result.chapter.short
          }
        )
      ];

      directory = [{
        number: result.chapter.number,
        title: result.chapter.title,
        url: result.chapter.url
      }];
    } else {
      chapters = directory.map((item, i) => {
        const prior = sameNovel
          ? previous.chapters.find(c => c.url === item.url)
          : null;

        return normalizeChapter(
          prior || {
            ...item,
            id: item.url,
            status: 'discovered',
            selected: true
          },
          i
        );
      });
    }

    novel.totalChapters = directory.length;

    sessionStore.set({
      ...createNovelSession({
        ...novel,
        adapterId: activeAdapter.id,
        language: 'zh'
      }),
      chapters: [...chapters]
    });

    updateNovelCard();
    render();
    updateExtractionButtons();

    status(
      `${activeAdapter.label} identified. ${directory.length} chapter link(s) found.`
    );

  } catch (error) {
    status(error.message || String(error));
  }
}
async function runExtraction(retryOnly=false){
  if(extractionRunning)return;
  const jobs=chapters.map((chapter,index)=>({chapter,index})).filter(x=>retryOnly
    ? x.chapter.status==='error'
    : x.chapter.selected&&x.chapter.status==='discovered');
  if(!jobs.length){status(retryOnly?'There are no failed chapters to retry.':'Select at least one chapter that has not already been extracted.');return;}
  extractionRunning=true;extractionPaused=false;errors=[];
  $('#progress-wrap').hidden=false;$('#pause-extract').textContent='Pause';
  $('#pause-extract').disabled=false;$('#retry-failed').disabled=true;$('#extract').disabled=true;
  let completed=0;
  try{
    for(let i=0;i<jobs.length;i++){
      await waitIfPaused();
      const {chapter,index}=jobs[i];
      $('#progress-bar').style.width=`${Math.round(completed/jobs.length*100)}%`;
      $('#progress-text').textContent=`Extracting ${completed+1} of ${jobs.length}: ${chapter.title}`;
      try{
        const doc=await fetchDocument(chapter.url);
        let extracted=activeAdapter.extractChapter(doc,chapter.url,chapter.title);

// Merge split chapters when the adapter provides a continuation URL.
if(extracted.isSplitPart && extracted.nextPartUrl){
  let nextUrl=extracted.nextPartUrl;
  let combined=extracted.text;
  let safety=0;

  while(nextUrl && safety++<8){
    const partDoc=await fetchDocument(nextUrl);
    const part=activeAdapter.extractChapter(partDoc,nextUrl,chapter.title);

    combined+=`\n\n${part.text}`;
    nextUrl=part.isSplitPart?part.nextPartUrl:null;
  }

  const words=combined.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)||[];

  extracted={
    ...extracted,
    text:combined,
    paragraphs:combined.split(/\n\s*\n/).filter(Boolean),
    wordCount:words.length,
    isSplitPart:false
  };
}

chapters[index]=normalizeChapter({...extracted,selected:!extracted.short,status:'extracted'});
      }catch(error){
        const message=error.message||String(error);errors.push({title:chapter.title,url:chapter.url,error:message});
        chapters[index]=normalizeChapter({...chapter,text:'',selected:false,status:'error',warnings:[message],error:message});
      }
      completed++;render();persistChapters();
      $('#progress-bar').style.width=`${Math.round(completed/jobs.length*100)}%`;
      $('#progress-text').textContent=`${completed} of ${jobs.length} processed · ${chapters.filter(c=>c.status==='error').length} failed`;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    $('#progress-text').textContent=`Finished: ${chapters.filter(c=>c.status==='extracted').length} extracted, ${chapters.filter(c=>c.status==='error').length} failed. Short chapters remain unchecked.`;
    status(retryOnly?'Retry pass finished.':'Extraction finished.');
  }catch(error){status(`Extraction interrupted: ${error.message||error}`);}
  finally{extractionRunning=false;extractionPaused=false;pauseWaiters.splice(0).forEach(resolve=>resolve());updateExtractionButtons();render();persistChapters();}
}
async function extractAll(){return runExtraction(false);}
async function retryFailed(){return runExtraction(true);}
$('#inspect').addEventListener('click', inspect);
$('#extract').addEventListener('click', extractAll);
$('#close-scraper').addEventListener('click', () => {
  if (extractionRunning) {
    status('Finish or pause extraction before closing the scraper.');
    return;
  }

  window.parent.postMessage({
    type: 'BERYLL_SCRAPER_CLOSE'
  }, '*');
});
$('#retry-failed').addEventListener('click',retryFailed);$('#pause-extract').addEventListener('click',()=>{if(!extractionRunning)return;setPaused(!extractionPaused);});
$('#clear').addEventListener('click',async()=>{sourceDoc=null;sourceUrl='';directory=[];chapters=[];novel=null;errors=[];extractionPaused=false;pauseWaiters.splice(0).forEach(resolve=>resolve());await sessionStore.clear();$('#source-url').value='';$('#source-badge').textContent='Not connected';$('#novel-card').hidden=true;$('#progress-wrap').hidden=true;render();updateExtractionButtons();status('Saved session cleared from this browser.');});
$('#select-all').addEventListener('click',()=>{chapters=selectAll(chapters,true);persistChapters();render();updateExtractionButtons();});$('#select-none').addEventListener('click',()=>{chapters=selectAll(chapters,false);persistChapters();render();updateExtractionButtons();});
$('#select-range').addEventListener('click',()=>{try{chapters=selectRange(chapters,Number($('#range-start').value),Number($('#range-end').value),true);persistChapters();render();updateExtractionButtons();}catch(e){status(e.message);}});
function exportMetadata(){return $('#include-metadata').checked?(novel||{}):{language:novel?.language||'zh'};}
$('#export-txt').addEventListener('click',()=>{const selected=getSelectedChapters(chapters).filter(c=>c.text);if(selected.length)downloadTxt(selected,$('#filename').value.trim(),exportMetadata());});
$('#export-docx').addEventListener('click',()=>{const selected=getSelectedChapters(chapters).filter(c=>c.text);if(selected.length)downloadDocx(selected,$('#filename').value.trim(),exportMetadata());});
$('#export-epub').addEventListener('click',()=>{const selected=getSelectedChapters(chapters).filter(c=>c.text);if(selected.length)downloadEpub(selected,$('#filename').value.trim(),exportMetadata());});
async function restoreSavedSession(){
  const saved=await sessionStore.restore();
  if(!saved)return;
  novel={title:saved.title,author:saved.author,description:saved.description||'',sourceUrl:saved.sourceUrl,sourceId:saved.sourceId};
  activeAdapter=getAdapter(saved.sourceUrl);
  chapters=normalizeChapters(saved.chapters||[]);
  directory=chapters.map(ch=>({number:ch.number,title:ch.title,url:ch.url}));
  updateNovelCard();render();updateExtractionButtons();
  $('#progress-wrap').hidden=false;
  const extracted=chapters.filter(ch=>ch.status==='extracted').length;
  const failed=chapters.filter(ch=>ch.status==='error').length;
  $('#progress-text').textContent=`Recovered ${extracted} extracted and ${failed} failed chapter(s). Reopen the source novel page and launch the bookmarklet to reconnect before continuing extraction.`;
  status('Recovered your previous session from this browser. Chapter text and selections were restored.');
}
restoreSavedSession().catch(()=>{status('Could not restore the previous session.');});
