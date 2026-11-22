function safeName(name){return String(name||'beryll-chapters').replace(/[\\/:*?"<>|]+/g,'-').trim()||'beryll-chapters';}
export function buildTxt(chapters, metadata={}) {
  const header=[metadata.title,metadata.author?`Author: ${metadata.author}`:''].filter(Boolean).join('\n');
  const body=chapters.map(ch=>`${ch.title}\n\n${ch.text}`).join('\n\n\n');
  return new Blob([header?`${header}\n\n${'='.repeat(32)}\n\n${body}`:body],{type:'text/plain;charset=utf-8'});
}
export function downloadTxt(chapters,filename,metadata={}){const blob=buildTxt(chapters,metadata);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${safeName(filename)}.txt`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
