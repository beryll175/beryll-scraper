import {cleanText, parseNumber, textFromNode, makeChapter, uniqueLinks} from './shared.js';
export function matches(input){try{const u=input instanceof URL?input:new URL(input);return u.hostname==='8book.com'||u.hostname.endsWith('.8book.com')||u.hostname==='thepaperbooks.com'||u.hostname.endsWith('.thepaperbooks.com');}catch{return false;}}
export function extractChapter(doc,pageUrl,fallbackTitle=''){
 const node=doc.querySelector('#content .text, #content, .chapter-content'); if(!node)throw new Error('8book chapter content not found: expected #content .text.');
 const title=cleanText(doc.querySelector('#subtitle')?.textContent||fallbackTitle||doc.title);
 const text=textFromNode(node,['.ad','.ads','.advertisement','.chapter-nav','#nch','#pch']);
 return makeChapter(pageUrl,title,text,parseNumber(title)||parseNumber(fallbackTitle));
}
export function inspect8book(doc,pageUrl){
 const links=uniqueLinks(doc,pageUrl,'#chapters a[href],.chapter-list a[href],#chapter-list a[href],.book-chapters a[href]');
 const chapter=doc.querySelector('#content .text, #content')?extractChapter(doc,pageUrl):null;
 const title=cleanText(doc.querySelector('meta[property="og:novel:book_name"]')?.content||doc.querySelector('h1')?.textContent||doc.title);
 const author=cleanText(doc.querySelector('meta[property="og:novel:author"]')?.content||'');
 return {kind:chapter?'chapter':links.length?'directory':'unknown',title,author,description:cleanText(doc.querySelector('meta[name="description"]')?.content||''),chapters:links,directoryPages:[],chapter};
}
export const eightBookAdapter={id:'8book',label:'8book / Infinite Novels',matches,inspect:inspect8book,extractChapter};
