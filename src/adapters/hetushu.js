import {cleanText, parseNumber, textFromNode, makeChapter, uniqueLinks} from './shared.js';

const HOSTS = new Set(['hetushu.com', 'www.hetushu.com', 'hetubook.com', 'www.hetubook.com']);

export function matches(input) {
  try {
    const u = input instanceof URL ? input : new URL(input);
    return HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function extractChapter(doc, pageUrl, fallbackTitle = '') {
  const node = doc.querySelector('#content');
  if (!node) throw new Error('Hetushu chapter content not found: expected #content.');

  const title = cleanText(
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('.title')?.textContent ||
    fallbackTitle ||
    doc.title
  );
  const text = textFromNode(node, ['.ad', '.ads', '.advertisement', '.sponsored', '.chapter-nav', '#next', '#pre']);
  return makeChapter(pageUrl, title, text, parseNumber(title) || parseNumber(fallbackTitle));
}

export function inspectHetushu(doc, pageUrl) {
  // Hetushu's catalogue is a definition list, not necessarily a conventional chapter-list div.
  const links = uniqueLinks(
    doc,
    pageUrl,
    'dl#dir a[href], #left a[href], #list a[href], .chapter-list a[href], .book-list a[href], .list a[href]'
  );
  const chapter = doc.querySelector('#content') ? extractChapter(doc, pageUrl) : null;
  const title = cleanText(
    doc.querySelector('meta[property="og:novel:book_name"]')?.content ||
    doc.querySelector('h1')?.textContent ||
    doc.title
  );
  const author = cleanText(doc.querySelector('meta[property="og:novel:author"]')?.content || '');

  return {
    kind: chapter ? 'chapter' : links.length ? 'directory' : 'unknown',
    title,
    author,
    description: cleanText(doc.querySelector('meta[name="description"]')?.content || ''),
    chapters: links,
    directoryPages: [],
    chapter
  };
}

export const hetushuAdapter = {
  id: 'hetushu',
  label: 'Hetushu / Hetubook',
  matches,
  inspect: inspectHetushu,
  extractChapter
};
