/** Non-destructive checks for a discovered/extracted chapter list. */
export function validateChapters(chapters = []) {
  const issues = [];
  const urls = new Map();
  const numbers = new Map();
  chapters.forEach((chapter, index) => {
    const label = chapter.title || `Chapter ${index + 1}`;
    if (chapter.url) {
      if (urls.has(chapter.url)) issues.push({type:'duplicate-url', severity:'error', index, message:`Duplicate chapter URL: ${label} (also listed at row ${urls.get(chapter.url)+1}).`});
      else urls.set(chapter.url, index);
    }
    if (Number.isFinite(Number(chapter.number)) && chapter.number !== null && chapter.number !== '') {
      const n = Number(chapter.number);
      if (numbers.has(n)) issues.push({type:'duplicate-number', severity:'warning', index, message:`Chapter number ${n} appears more than once.`});
      else numbers.set(n, index);
    }
    if (chapter.status === 'error') issues.push({type:'failed', severity:'error', index, message:`${label}: ${chapter.error || 'Extraction failed.'}`});
    else if (chapter.status === 'extracted' && !String(chapter.text || '').trim()) issues.push({type:'empty', severity:'error', index, message:`${label}: extraction returned empty text.`});
    if (chapter.short) issues.push({type:'short', severity:'warning', index, message:`${label}: unusually short (${chapter.wordCount || 0} counted units).`});
  });
  const pending=chapters.filter(c=>c.status==='discovered').length;
  if(pending) issues.push({type:'pending',severity:'info',index:-1,message:`${pending} chapter(s) have not been extracted yet.`});
  const sorted = [...numbers.keys()].sort((a,b)=>a-b);
  for (let i=1;i<sorted.length;i++) if (sorted[i] > sorted[i-1]+1) {
    issues.push({type:'gap', severity:'warning', index:numbers.get(sorted[i]), message:`Possible numbering gap between chapters ${sorted[i-1]} and ${sorted[i]}.`});
  }
  return {issues, counts:{errors:issues.filter(x=>x.severity==='error').length,warnings:issues.filter(x=>x.severity==='warning').length,info:issues.filter(x=>x.severity==='info').length}};
}
