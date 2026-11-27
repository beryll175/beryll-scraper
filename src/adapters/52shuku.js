import {cleanText, parseNumber, textFromNode, makeChapter, uniqueLinks, safeSameHostUrl} from './shared.js';
const HOSTS=new Set(['52shuku.net','www.52shuku.net']);
export function matches(input){try{const u=input instanceof URL?input:new URL(input);return HOSTS.has(u.hostname.toLowerCase());}catch{return false;}}
export function findDirectoryPages(doc,pageUrl){
 const out=[],seen=new Set([new URL(pageUrl).href]);
 doc.querySelectorAll('.pagination a[href],.page a[href],.catalog a[href],a[href*="bkggN_"]').forEach(a=>{const url=safeSameHostUrl(a.getAttribute('href'),pageUrl);if(!url||seen.has(url))return;seen.add(url);if(/bkggN_\d+\.html/i.test(url))out.push({title:cleanText(a.textContent)||'Directory page',url});});
 return out;
}
export function extractChapter(doc,pageUrl,fallbackTitle=''){
 const node=doc.querySelector('.article-content'); if(!node)throw new Error('52书库 chapter content not found: expected .article-content.');
 const title=cleanText(doc.querySelector('h1')?.textContent||doc.title||fallbackTitle);
 const text=textFromNode(node,['.ad-slot','.ad-label','.ad-body','.pagination2','.article-nav','.related_top','.related_posts','script','.ads','.advertisement']);
 return makeChapter(pageUrl,'',text,parseNumber(title)||parseNumber(fallbackTitle));
}
export function inspect52Shuku(doc,pageUrl){
 const links=uniqueLinks(doc,pageUrl,'.catalog a[href],.chapter-list a[href],.book-list a[href],#chapter-list a[href],.list a[href]');
 const chapter=doc.querySelector('.article-content')?extractChapter(doc,pageUrl):null;
 const title=cleanText(doc.querySelector('meta[property="og:novel:book_name"]')?.content||doc.querySelector('h1')?.textContent||doc.title).replace(/_在线阅读.*$/,'');
 const author=cleanText(doc.querySelector('.book-info .author')?.textContent||'');
 return {kind:chapter?'chapter':links.length?'directory':'unknown',title,author,description:cleanText(doc.querySelector('meta[name="description"]')?.content||''),chapters:links,directoryPages:findDirectoryPages(doc,pageUrl),chapter};
}
export const shuku52Adapter={id:'52shuku',label:'52书库',matches,inspect:inspect52Shuku,extractChapter,exportFormats:['txt','docx']};
