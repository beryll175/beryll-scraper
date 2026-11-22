import {xbanxiaAdapter} from './adapters/xbanxia.js';
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
function setPaused(value){extractionPaused=value;$('#pause-extract').textContent=value?'Resume':'Pause';$('#progress-text').textContent=value?'Paused after the current chapter.':'Resuming extraction…';if(!value){pauseWaiters.splice(0).forEach(resolve=>resolve());}}
async function waitIfPaused(){if(!extractionPaused)return;await new Promise(resolve=>pauseWaiters.push(resolve));}
function persistChapters(){if(sessionStore.get())sessionStore.update(s=>({...s,chapters}));}
function updateExtractionButtons(){ $('#pause-extract').disabled=!extractionRunning;$('#retry-failed').disabled=extractionRunning||!sourceDoc||!chapters.some(c=>c.status==='error');$('#extract').disabled=extractionRunning||!sourceDoc||!chapters.some(c=>c.status==='discovered'&&c.selected);$('#clear').disabled=extractionRunning; }
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
function updateExport(){ const ready=getSelectedChapters(chapters).some(c=>c.text); $('#export-txt').disabled=!ready; $('#export-docx').disabled=!ready; $('#export-epub').disabled=!ready; renderValidation(); }
function renderValidation(){const box=$('#validation');if(!chapters.length){box.hidden=true;return;}const report=validateChapters(chapters);box.hidden=false;box.replaceChildren();const heading=document.createElement('h3');heading.textContent=`Validation: ${report.counts.errors} error(s), ${report.counts.warnings} warning(s), ${report.counts.info} pending`;box.append(heading);if(!report.issues.length){const ok=document.createElement('p');ok.className='hint';ok.textContent='No issues detected.';box.append(ok);return;}const list=document.createElement('ul');report.issues.forEach(issue=>{const item=document.createElement('li');item.className=issue.severity;item.textContent=issue.message;list.append(item);});box.append(list);}
function updateNovelCard(){ $('#novel-card').hidden=!novel; if(!novel)return;$('#novel-title').textContent=novel.title||'—';$('#novel-author').textContent=novel.author||'—';$('#novel-total').textContent=String(directory.length);$('#novel-description').textContent=novel.description||''; }
connectSourceBridge(({html,url})=>{sourceDoc=parse(html);sourceUrl=new URL(url).href;$('#source-url').value=sourceUrl;$('#source-badge').textContent=new URL(url).hostname;status(sessionStore.get()?'Source reconnected. Your saved session is still available.':'Connected to source page. Ready to inspect.');updateExtractionButtons();});
async function fetchDocument(url){const result=await fetchSourcePage(url);return parse(result.html);}
async function inspect(){
  if(!sourceDoc||!sourceUrl){status('No source-page connection. Close the panel and launch the bookmarklet from the novel page.');return;}
  if(!xbanxiaAdapter.matches(sourceUrl)){status('This build currently supports Xbanxia only.');return;}
  try{
    const result=xbanxiaAdapter.inspect(sourceDoc,sourceUrl);
    if(result.kind==='unknown')throw new Error('Could not identify an Xbanxia novel directory or chapter page.');
    novel={title:result.title,author:result.author,description:result.description,sourceUrl,sourceId:new URL(sourceUrl).pathname};
    directory=[...result.chapters];
    const previous=sessionStore.get();
    const novelKey=url=>{const parts=new URL(url).pathname.split('/').filter(Boolean);return parts[0]==='books'?(parts[1]||''):(new URL(url).pathname);};
    const sameNovel=previous && novelKey(previous.sourceUrl)===novelKey(sourceUrl);
    if(result.kind==='chapter'&&result.chapter){
      const prior=sameNovel?previous.chapters.find(c=>c.url===result.chapter.url):null;
      chapters=[normalizeChapter(prior||{...result.chapter,selected:!result.chapter.short})];directory=[{number:result.chapter.number,title:result.chapter.title,url:result.chapter.url}];
    } else chapters=[];
    // Discover additional directory pages, keeping source order and preventing loops.
    const seenPages=new Set([sourceUrl]);let pageLinks=result.kind==='directory'?result.directoryPages:[];
    while(pageLinks.length){const next=pageLinks.find(p=>!seenPages.has(p.url));if(!next)break;seenPages.add(next.url);const page=await fetchDocument(next.url);const found=xbanxiaAdapter.inspect(page,next.url);directory.push(...found.chapters);pageLinks=found.directoryPages;}
    const seen=new Set();directory=directory.filter(ch=>{if(seen.has(ch.url))return false;seen.add(ch.url);return true;});
    novel.totalChapters=directory.length;
    if(result.kind!=='chapter') chapters=directory.map((item,i)=>{const prior=sameNovel?previous.chapters.find(c=>c.url===item.url):null;return normalizeChapter(prior||{...item,id:item.url,status:'discovered',selected:true},i);});
    sessionStore.set({...createNovelSession({...novel,adapterId:'xbanxia',language:'zh'}),chapters:[...chapters]});updateNovelCard();render();
    updateExtractionButtons();
    status(`Xbanxia ${result.kind} identified. ${directory.length} chapter link(s) found.`);
  }catch(error){status(error.message||String(error));}
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
        const extracted=xbanxiaAdapter.extractChapter(doc,chapter.url,chapter.title);
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
$('#inspect').addEventListener('click',inspect);$('#extract').addEventListener('click',extractAll);$('#retry-failed').addEventListener('click',retryFailed);$('#pause-extract').addEventListener('click',()=>{if(!extractionRunning)return;setPaused(!extractionPaused);});
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
