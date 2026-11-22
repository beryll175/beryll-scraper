/** Xbanxia adapter. Selectors verified against user-supplied rendered HTML. */
const HOSTS = new Set(['xbanxia.cc', 'www.xbanxia.cc']);
const REMOVE_FROM_CONTENT = [
  'script','style','noscript','iframe','form','button','input','textarea','select',
  'nav','.nav2','.pagination','.page','.comment','.comments','#comments',
  '[id^="bn-"]','[class*="ad-"]','[class*="ads"]','[id*="ad-"]',
  '.trc_related_container','.sponsored','.advertisement'
].join(',');

export function matches(input) {
  try { const url = input instanceof URL ? input : new URL(input); return HOSTS.has(url.hostname.toLowerCase()); }
  catch { return false; }
}
function cleanText(value='') {
  return String(value).replace(/\u00a0/g,' ').replace(/[\u2003\u3000]/g,' ')
    .replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n')
    .replace(/\n{3,}/g,'\n\n').trim();
}
export function parseChapterNumber(title='') {
  const m=String(title).match(/(?:chapter|ch\.?|episode)\s*0*(\d+)|第\s*0*(\d+)\s*[章节回話话]/i);
  return m ? Number(m[1] || m[2]) : null;
}
function sameHostUrl(href, baseUrl) {
  try { const u=new URL(href,baseUrl), base=new URL(baseUrl); return ['http:','https:'].includes(u.protocol) && u.hostname.toLowerCase()===base.hostname.toLowerCase() ? u.href : null; }
  catch { return null; }
}
export function findDirectoryLinks(doc,pageUrl) {
  const seen=new Set(), links=[];
  doc.querySelectorAll('.book-list ul li a[href]').forEach(a=>{
    const url=sameHostUrl(a.getAttribute('href'),pageUrl);
    const title=cleanText(a.getAttribute('title') || a.textContent);
    if(!url || !title || seen.has(url)) return;
    seen.add(url); links.push({number:parseChapterNumber(title),title,url});
  });
  return links;
}
export function findDirectoryPageLinks(doc,pageUrl) {
  const seen=new Set([new URL(pageUrl).href]), found=[];
  doc.querySelectorAll('.pagination a[href],.page a[href],a[rel="next"]').forEach(a=>{
    const url=sameHostUrl(a.getAttribute('href'),pageUrl); if(!url || seen.has(url)) return;
    const label=cleanText(a.textContent), rel=(a.getAttribute('rel')||'').toLowerCase();
    const cls=String(a.className||'').toLowerCase();
    if(rel==='next' || /^(下一页|下頁|next|末页|末頁|\d+)$/.test(label) || /next|page/.test(cls)) { seen.add(url); found.push({title:label||'Next page',url}); }
  });
  return found;
}
export function extractChapter(doc,pageUrl,fallbackTitle='') {
  const node=doc.querySelector('#nr1');
  if(!node) throw new Error('Chapter content not found: expected #nr1.');
  const title=cleanText(doc.querySelector('#nr_title')?.textContent || fallbackTitle || doc.title || 'Untitled Chapter');
  const clone=node.cloneNode(true);
  clone.querySelectorAll(REMOVE_FROM_CONTENT).forEach(el=>el.remove());
  // Remove known ad containers even if their class/id does not match common patterns.
  clone.querySelectorAll('div[id^="bn"],div[class*="sponsor"],div[class*="banner"]').forEach(el=>el.remove());
  // Preserve line breaks from the source's <br>-separated paragraphs.
  clone.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
  clone.querySelectorAll('p,div').forEach(el=>el.append('\n'));
  const raw=clone.textContent || '';
  const paragraphs=raw.split(/\n+/).map(cleanText).filter(Boolean);
  const text=paragraphs.join('\n\n');
  if(!text) throw new Error('The #nr1 container was found, but no readable chapter text remained after cleaning.');
  const cjk=(text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)||[]).length;
  const latin=(text.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g)||[]).length;
  const wordCount=cjk+latin;
  return {url:new URL(pageUrl).href,number:parseChapterNumber(title)||parseChapterNumber(fallbackTitle),title,text,paragraphs,wordCount,short:wordCount<50};
}
export function inspectXbanxia(doc, pageUrl) {
  const directoryLinks=findDirectoryLinks(doc,pageUrl);
  const chapter=doc.querySelector('#nr1') ? extractChapter(doc,pageUrl) : null;
  const title=cleanText(doc.querySelector('.book-describe h1')?.textContent || doc.querySelector('#nr_title')?.textContent || doc.querySelector('h1')?.textContent || doc.title || '');
  const author=cleanText(doc.querySelector('.book-describe p a')?.textContent || '');
  const descriptionNode=doc.querySelector('.describe-html')?.cloneNode(true);
  descriptionNode?.querySelectorAll(REMOVE_FROM_CONTENT).forEach(el=>el.remove());
  const description=cleanText(descriptionNode?.textContent || '');
  return {kind:chapter?'chapter':directoryLinks.length?'directory':'unknown',title,author,description,chapters:directoryLinks,directoryPages:findDirectoryPageLinks(doc,pageUrl),chapter};
}
export const xbanxiaAdapter={id:'xbanxia',label:'Xbanxia',matches,inspect:inspectXbanxia,extractChapter};
