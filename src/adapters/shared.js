export function cleanText(value = '') {
  return String(value).replace(/\u00a0/g, ' ').replace(/[\u2003\u3000]/g, ' ')
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}
export function safeSameHostUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== new URL(baseUrl).hostname) return null;
    return url.href;
  } catch { return null; }
}
export function parseNumber(value = '') {
  const m = String(value).match(/(?:chapter|ch\.?|episode)\s*0*(\d+)|第\s*0*(\d+)\s*[章节回話话]|(?:^|\D)(\d{1,6})(?:\D|$)/i);
  return m ? Number(m[1] || m[2] || m[3]) : null;
}
export function textFromNode(node, remove = []) {
  if (!node) return '';
  const clone = node.cloneNode(true);
  clone.querySelectorAll(['script','style','noscript','iframe','form','button','input','textarea','select','nav', ...remove].join(',')).forEach(el => el.remove());
  clone.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
  clone.querySelectorAll('p,div,section').forEach(el => el.append('\n'));
  return cleanText((clone.textContent || '').split(/\n+/).map(cleanText).filter(Boolean).join('\n\n'));
}
export function wordCount(text) {
  return (String(text).match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || []).length;
}
export function makeChapter(url, title, text, number = parseNumber(title)) {
  const count = wordCount(text);
  if (!text) throw new Error('No readable chapter text was found.');
  return { url: new URL(url).href, number, title: cleanText(title), text, paragraphs: text.split(/\n\s*\n/).map(cleanText).filter(Boolean), wordCount: count, short: count < 50 };
}
export function uniqueLinks(doc, pageUrl, selectors, {titleFrom='text'} = {}) {
  const items = [];

  doc.querySelectorAll(selectors).forEach(a => {
    const url = safeSameHostUrl(a.getAttribute('href'), pageUrl);

    const title = cleanText(
      titleFrom === 'title'
        ? a.getAttribute('title') || a.textContent
        : a.textContent || a.getAttribute('title')
    );

    if (!url || !title || url === new URL(pageUrl).href) return;

    items.push({
      number: parseNumber(title),
      title,
      url
    });
  });

  return items;
}
