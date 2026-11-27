import {cleanText, parseNumber, textFromNode, makeChapter, uniqueLinks} from './shared.js';
export function matches(input){try{const u=input instanceof URL?input:new URL(input);return u.hostname==='czbooks.net'||u.hostname==='www.czbooks.net';}catch{return false;}}
export function extractChapter(doc,pageUrl){
 const node=doc.querySelector('.content, #content, .chapter-content'); if(!node) throw new Error('CZBooks chapter content not found.');
 const text=textFromNode(node,['.chapter-title','.chapter-nav','.ads','.ad','.advertisement','.recommend']);
 // This source is intentionally exported without chapter headings.
 return makeChapter(pageUrl,'',text,parseNumber(doc.title));
}
export function inspectCZBooks(doc,pageUrl){
 const links=uniqueLinks(doc,pageUrl,'#chapter-list a[href],.chapter-list a[href],.chapter-list-box a[href],.book-chapter-list a[href],#list-chapter a[href]');
 const chapter=doc.querySelector('.content, #content, .chapter-content')?extractChapter(doc,pageUrl):null;
 const title=cleanText(doc.querySelector('meta[property="og:novel:book_name"]')?.content||doc.querySelector('h1')?.textContent||doc.title);
 const author=cleanText(doc.querySelector('meta[property="og:novel:author"]')?.content||'');
 return {kind:chapter?'chapter':links.length?'directory':'unknown',title,author,description:cleanText(doc.querySelector('meta[name="description"]')?.content||''),chapters:links,directoryPages:[],chapter};
}
export const czbooksAdapter={id:'czbooks',label:'CZBooks / 小說狂人',matches,inspect:inspectCZBooks,extractChapter,exportFormats:['txt','docx']};
