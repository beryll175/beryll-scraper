/** RPC bridge to the bookmarklet running in the source page's origin. */
const pending=new Map();
let sequence=0;
export function connectSourceBridge(onSnapshot) {
  window.addEventListener('message', event=>{
    if(event.source!==window.parent || event.data?.type!=='BERYLL_SCRAPER_PAGE') return;
    const {html,url}=event.data;
    if(typeof html==='string' && typeof url==='string') onSnapshot({html,url});
  });
}
export function fetchSourcePage(url) {
  return new Promise((resolve,reject)=>{
    const id=`bcu-${Date.now()}-${++sequence}`;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Timed out waiting for the source page to fetch this chapter.'));},30000);
    pending.set(id,{resolve,reject,timer});
    window.parent.postMessage({type:'BERYLL_SCRAPER_FETCH',id,url},'*');
  });
}
window.addEventListener('message',event=>{
  if(event.source!==window.parent || event.data?.type!=='BERYLL_SCRAPER_FETCH_RESULT') return;
  const item=pending.get(event.data.id); if(!item) return;
  clearTimeout(item.timer); pending.delete(event.data.id);
  if(event.data.ok) item.resolve({html:event.data.html,url:event.data.url});
  else item.reject(new Error(event.data.error || 'Source-page fetch failed.'));
});
