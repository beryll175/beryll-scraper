import {cleanText, parseNumber, textFromNode, makeChapter, uniqueLinks, safeSameHostUrl} from './shared.js';

const HOSTS = new Set(['52shuku.net', 'www.52shuku.net']);

export function matches(input) {
  try {
    const u = input instanceof URL ? input : new URL(input);
    return HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isReaderPage(pageUrl) {
  return /\/bkggN_\d+\.html(?:$|[?#])/i.test(new URL(pageUrl).pathname + new URL(pageUrl).search);
}

function getNovelTitle(doc) {
  return cleanText(
    doc.querySelector('meta[property="og:novel:book_name"]')?.content ||
    doc.querySelector('h1')?.textContent ||
    doc.title
  ).replace(/_在线阅读.*$/, '');
}

export function extractChapter(doc, pageUrl, fallbackTitle = '') {
  const node = doc.querySelector('.article-content');
  if (!node) throw new Error('52书库 chapter content not found: expected .article-content.');

  const pageTitle = cleanText(doc.querySelector('h1')?.textContent || fallbackTitle || '');
  const text = textFromNode(node, [
    '.ad-slot', '.ad-label', '.ad-body', '.pagination2', '.article-nav',
    '.related_top', '.related_posts', 'script', '.ads', '.advertisement'
  ]);

  return makeChapter(
    pageUrl,
    fallbackTitle || pageTitle || 'Chapter',
    text,
    parseNumber(fallbackTitle) || parseNumber(pageTitle)
  );
}

export function inspect52Shuku(doc, pageUrl) {
  const readerPage = isReaderPage(pageUrl);
  const chapter = readerPage && doc.querySelector('.article-content')
    ? extractChapter(doc, pageUrl)
    : null;

  // The novel intro page contains the actual numbered reading-page links in ul.list.
  // Each page is a separate content page and should be listed as an extractable item,
  // not queued as another directory page.
  const links = readerPage ? [] : uniqueLinks(
    doc,
    pageUrl,
    'ul.list li.mulu a[href], .catalog a[href], .chapter-list a[href], .book-list a[href], #chapter-list a[href], .list a[href]'
  );

  return {
    kind: chapter ? 'chapter' : links.length ? 'directory' : 'unknown',
    title: getNovelTitle(doc),
    author: cleanText(doc.querySelector('.book-info .author')?.textContent || ''),
    description: cleanText(doc.querySelector('meta[name="description"]')?.content || ''),
    chapters: links,
    directoryPages: [],
    chapter
  };
}

export const shuku52Adapter = {
  id: '52shuku',
  label: '52书库',
  matches,
  inspect: inspect52Shuku,
  extractChapter,
  exportFormats: ['txt', 'docx']
};
