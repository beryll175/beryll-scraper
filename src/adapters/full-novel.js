/** Full Novel Website adapter. */

const HOST = 'quanben-xiaoshuo.com';

export function matches(input) {
  try {
    const url = input instanceof URL ? input : new URL(input);
    return url.hostname === HOST ||
      url.hostname.endsWith('.' + HOST);
  } catch {
    return false;
  }
}

function cleanText(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2003\u3000]/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseChapterNumber(title = '') {
  const match = String(title).match(
    /(?:chapter|ch\.?|episode)\s*0*(\d+)|第\s*0*(\d+)\s*[章节回話话]/i
  );

  return match ? Number(match[1] || match[2]) : null;
}

function safeUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.hostname !== new URL(baseUrl).hostname
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function getNovelTitle(doc) {
  const breadcrumb = [
    ...doc.querySelectorAll('.breadcrumb a')
  ]
    .map(a => cleanText(a.textContent))
    .filter(Boolean);

  if (breadcrumb.length) {
    return breadcrumb.at(-1);
  }

  return cleanText(
    doc.querySelector('.title')?.textContent ||
    doc.title ||
    'Untitled Novel'
  );
}

export function findDirectoryLinks(doc, pageUrl) {
  const seen = new Set();
  const chapters = [];

  doc.querySelectorAll('.content .list a[href]').forEach(a => {
    const url = safeUrl(a.getAttribute('href'), pageUrl);

    const title = cleanText(
      a.getAttribute('title') || a.textContent
    );

    if (!url || !title || seen.has(url)) return;

    seen.add(url);

    chapters.push({
      number: parseChapterNumber(title),
      title,
      url
    });
  });

  return chapters;
}

export function extractChapter(doc, pageUrl, fallbackTitle = '') {
  const node = doc.querySelector('#articlebody, .articlebody');

  if (!node) {
    throw new Error(
      'Chapter content not found. Expected #articlebody or .articlebody.'
    );
  }

  const title = cleanText(
    doc.querySelector('.title')?.textContent ||
    fallbackTitle ||
    doc.title ||
    'Untitled Chapter'
  );

  const clone = node.cloneNode(true);

  // Remove advertisements, scripts and unrelated elements.
  clone.querySelectorAll([
    'script',
    'style',
    'noscript',
    'iframe',
    'form',
    'button',
    'input',
    'textarea',
    'select',
    'nav',
    '.ads',
    '.advertisement',
    '.sponsored',
    '.tc.dir',
    '[id^="ad"]',
    '[class*="ad-"]',
    '[class*="ads"]'
  ].join(',')).forEach(el => el.remove());

  // Preserve paragraph formatting.
  clone.querySelectorAll('br').forEach(el => {
    el.replaceWith('\n');
  });

  clone.querySelectorAll('p').forEach(el => {
    el.append('\n');
  });

  // PAGE 1, PAGE 2 markers are HTML comments.
  // They are automatically ignored by textContent.

  const paragraphs = (clone.textContent || '')
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);

  const text = paragraphs.join('\n\n');

  if (!text) {
    throw new Error('No readable chapter text was found.');
  }

  const cjk = (
    text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []
  ).length;

  const latin = (
    text.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g) || []
  ).length;

  const wordCount = cjk + latin;

  return {
    url: new URL(pageUrl).href,
    number: parseChapterNumber(title) ||
      parseChapterNumber(fallbackTitle),
    title,
    text,
    paragraphs,
    wordCount,
    short: wordCount < 50
  };
}

export function inspectFullNovel(doc, pageUrl) {
  const chapters = findDirectoryLinks(doc, pageUrl);

  const chapter = doc.querySelector(
    '#articlebody, .articlebody'
  )
    ? extractChapter(doc, pageUrl)
    : null;

  const author = cleanText(
    doc.querySelector('.info [itemprop="author"] strong')
      ?.textContent ||
    doc.querySelector('.info [itemprop="author"]')
      ?.textContent ||
    ''
  );

  const description = cleanText(
    doc.querySelector('meta[name="description"]')
      ?.getAttribute('content') || ''
  );

  return {
    kind: chapter
      ? 'chapter'
      : chapters.length
        ? 'directory'
        : 'unknown',

    title: getNovelTitle(doc),
    author,
    description,
    chapters,
    directoryPages: [],
    chapter
  };
}

export const fullNovelAdapter = {
  id: 'full-novel-website',
  label: 'Full Novel Website',
  matches,
  inspect: inspectFullNovel,
  extractChapter
};
