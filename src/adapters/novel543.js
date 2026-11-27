import {cleanText, safeSameHostUrl, parseNumber, textFromNode, makeChapter, uniqueLinks} from './shared.js';
const HOST = 'www.novel543.com';
export function matches(input) { try { const u=input instanceof URL?input:new URL(input); return u.hostname===HOST || u.hostname==='novel543.com'; } catch { return false; } }
function getNovelTitle(doc) { return cleanText(doc.querySelector('meta[property="og:novel:book_name"]')?.content || doc.querySelector('h1')?.textContent || doc.title).replace(/^《|》$/g,''); }
function nextPart(doc, pageUrl) {
  for (const script of doc.scripts) {
    const m = (script.textContent || '').match(/\bnextUrl\s*=\s*['"]([^'"]+)['"]/);
    if (m) return safeSameHostUrl(m[1], pageUrl);
  }
  return null;
}
export function inspectNovel543(doc, pageUrl) {
  const links = uniqueLinks(doc, pageUrl, '.chapter-list a[href],.list-chapter a[href],.chapter a[href],#chapter-list a[href],.book-chapter-list a[href],.catalog a[href],a[href*="_1.html"]');
  const content = doc.querySelector('.chapter-content .content, .chapter-content, #chapter-content, .read-content');
  const title = cleanText(doc.querySelector('h1')?.textContent || doc.title);
  const chapter = content ? extractChapter(doc, pageUrl) : null;
  return {kind:chapter?'chapter':links.length?'directory':'unknown', title:getNovelTitle(doc), author:cleanText(doc.querySelector('meta[property="og:novel:author"]')?.content || ''), description:cleanText(doc.querySelector('meta[name="description"]')?.content || ''), chapters:links, directoryPages:[], chapter};
}
export function extractChapter(doc, pageUrl, fallbackTitle='') {
  const node=doc.querySelector('.chapter-content .content, .chapter-content, #chapter-content, .read-content');
  if(!node) throw new Error('Novel543 chapter content not found.');
  const title=cleanText(doc.querySelector('h1')?.textContent || doc.querySelector('.chapter-title')?.textContent || fallbackTitle || doc.title);
  const text=textFromNode(node,['.ad','.ads','.advertisement','.chapter-nav','.read-page']);
  const result=makeChapter(pageUrl,title,text,parseNumber(title)||parseNumber(fallbackTitle));
  result.nextPartUrl=nextPart(doc,pageUrl);
  result.isSplitPart=/\(\s*1\s*\/\s*\d+\s*\)/.test(title) || /_1\.html(?:$|\?)/.test(new URL(pageUrl).pathname);
  return result;
}
export const novel543Adapter={id:'novel543',label:'Novel543',matches,inspect:inspectNovel543,extractChapter};
