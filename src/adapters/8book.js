import {cleanText, parseNumber, textFromNode, makeChapter} from './shared.js';

export function matches(input) {
  try {
    const u = input instanceof URL ? input : new URL(input);
    const host = u.hostname.toLowerCase();
    return host === '8book.com' || host.endsWith('.8book.com') ||
      host === 'thepaperbooks.com' || host.endsWith('.thepaperbooks.com');
  } catch {
    return false;
  }
}

export function extractChapter(doc, pageUrl, fallbackTitle = '') {
  const node = doc.querySelector('#content .text, #content, .chapter-content');
  if (!node) throw new Error('8book chapter content not found: expected #content .text.');

  const title = cleanText(doc.querySelector('#subtitle')?.textContent || fallbackTitle || doc.title);
  const text = textFromNode(node, ['.ad', '.ads', '.advertisement', '.chapter-nav', '#nch', '#pch']);
  return makeChapter(pageUrl, title, text, parseNumber(title) || parseNumber(fallbackTitle));
}

function chapterLinks8book(doc, pageUrl) {
  const pageHost = new URL(pageUrl).hostname.toLowerCase();
  const allowedHosts = new Set([pageHost, 'sport.thepaperbooks.com']);
  const seen = new Set();
  const items = [];

  doc.querySelectorAll(
    '#chapters a.episode_li[href], #chapters a[href], .chapter-list a[href], #chapter-list a[href], .book-chapters a[href]'
  ).forEach(a => {
    let url;
    try {
      url = new URL(a.getAttribute('href'), pageUrl);
    } catch {
      return;
    }

    if (!['http:', 'https:'].includes(url.protocol) ||
        !allowedHosts.has(url.hostname.toLowerCase()) ||
        url.href === new URL(pageUrl).href ||
        seen.has(url.href)) return;

    const title = cleanText(a.textContent || a.getAttribute('title') || '');
    if (!title) return;

    seen.add(url.href);
    items.push({number: parseNumber(title), title, url: url.href});
  });

  return items;
}

export function inspect8book(doc, pageUrl) {
  const links = chapterLinks8book(doc, pageUrl);
  const chapter = doc.querySelector('#content .text, #content')
    ? extractChapter(doc, pageUrl)
    : null;

  const title = cleanText(
    doc.querySelector('meta[property="og:novel:book_name"]')?.content ||
    doc.querySelector('h1')?.textContent ||
    doc.title
  );

  const author = cleanText(
    doc.querySelector('meta[property="og:novel:author"]')?.content || ''
  );

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

export const eightBookAdapter = {
  id: '8book',
  label: '8book / Infinite Novels',
  matches,
  inspect: inspect8book,
  extractChapter
};
