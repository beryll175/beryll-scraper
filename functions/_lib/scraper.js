import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

const CHAPTER_TEXT = /(?:chapter|ch\.?|episode)\s*\d+|第\s*\d+\s*[章节回話話]/i;
const NEXT_TEXT = /^(?:next(?:\s+chapter)?|下一章|下一節|下一节|後一章|后一章|›|»|→)$/i;
const BATCH_SIZE = 10;
const DELAY_MS = 1000;
const USER_AGENT = 'BeryllScraper/1.0 (+respectful public-page reader)';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host.includes(':')) return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function validateSourceUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Enter a valid page URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS pages are supported.');
  if (url.username || url.password) throw new Error('URLs containing login credentials are not supported.');
  if (isPrivateHost(url.hostname)) throw new Error('Private, local and loopback addresses are not allowed.');
  return url;
}

async function robotsAllowed(url, cache) {
  const origin = url.origin;
  if (!cache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    const promise = fetch(robotsUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
      .then(async response => {
        if (response.status === 404) return { parser: null, allowAll: true };
        if (!response.ok) throw new Error(`Could not verify robots.txt (HTTP ${response.status}).`);
        return { parser: robotsParser(robotsUrl, await response.text()), allowAll: false };
      });
    cache.set(origin, promise);
  }
  const rules = await cache.get(origin);
  if (rules.allowAll) return true;
  return rules.parser.isAllowed(url.href, USER_AGENT) === true;
}

async function fetchHtml(value, origin, robotsCache, lastRequest) {
  let url = validateSourceUrl(value);
  if (url.hostname !== new URL(origin).hostname) throw new Error('The page is outside the original website.');
  if (!await robotsAllowed(url, robotsCache)) throw new Error(`Blocked by robots.txt or robots rules could not be verified: ${url.href}`);
  const elapsed = Date.now() - lastRequest.value;
  if (lastRequest.value && elapsed < DELAY_MS) await sleep(DELAY_MS - elapsed);
  lastRequest.value = Date.now();

  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url.href, {
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.7'
      },
      signal: AbortSignal.timeout(18000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new Error('Too many or invalid redirects.');
      const next = validateSourceUrl(new URL(location, url).href);
      if (next.hostname !== new URL(origin).hostname) throw new Error('A redirect attempted to leave the original website.');
      url = next;
      continue;
    }
    if (!response.ok) throw new Error(`Page request failed (HTTP ${response.status}).`);
    const type = response.headers.get('content-type') || '';
    if (!/html|xhtml/i.test(type)) throw new Error('The URL did not return an HTML page.');
    const html = await response.text();
    if (html.length > 5_000_000) throw new Error('The page is too large to process safely (5 MB limit).');
    return { html, finalUrl: url.href };
  }
  throw new Error('Could not fetch the page.');
}

function titleOf($, fallback = '') {
  return $('h1').first().text().trim() || $('title').first().text().trim() || fallback;
}
function numberOf(text) {
  const match = String(text || '').match(/(?:chapter|ch\.?|episode)\s*0*(\d+)|第\s*0*(\d+)\s*[章节回話話]/i);
  return match ? Number(match[1] || match[2]) : null;
}
function findDirectoryLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];
  const seen = new Set();
  $('a[href]').each((_, element) => {
    const text = $(element).text().replace(/\s+/g, ' ').trim();
    const href = $(element).attr('href');
    if (!text || !href || !CHAPTER_TEXT.test(text)) return;
    try {
      const url = new URL(href, pageUrl);
      if (url.hostname !== new URL(pageUrl).hostname || !['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) return;
      seen.add(url.href);
      links.push({ number: numberOf(text), title: text, url: url.href });
    } catch {}
  });
  return links;
}
function findNext($, pageUrl) {
  let next = null;
  $('a[href], [rel="next"]').each((_, element) => {
    if (next) return;
    const item = $(element);
    const label = [item.text(), item.attr('aria-label'), item.attr('title')].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const rel = (item.attr('rel') || '').toLowerCase();
    const href = item.attr('href');
    if (!href || /^(?:javascript:|#)/i.test(href)) return;
    if (rel === 'next' || NEXT_TEXT.test(label) || /next\s*chapter|下一章|下一节/i.test(label)) {
      try { next = new URL(href, pageUrl).href; } catch {}
    }
  });
  return next;
}
function extractFromHtml(html, url, fallbackTitle = '') {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || $('title').first().text().trim() || fallbackTitle || 'Untitled Chapter';
  const remove = 'script,style,noscript,nav,header,footer,aside,form,button,iframe,.advertisement,.ads,.social-share,.pagination,.comments,.comment';
  const candidates = $('article, main, [class*="chapter" i], [id*="chapter" i], [class*="content" i], [id*="content" i], section, body').toArray();
  let best = null;
  let bestScore = -1;
  for (const element of candidates) {
    const clone = $(element).clone();
    clone.find(remove).remove();
    const paragraphs = clone.find('p').toArray().map(p => $(p).text().replace(/\s+/g, ' ').trim()).filter(Boolean);
    const text = paragraphs.length ? paragraphs.join(' ') : clone.text().replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const score = text.length + paragraphs.length * 80;
    if (score > bestScore) { bestScore = score; best = paragraphs.length ? paragraphs : [text]; }
  }
  if (!best) throw new Error('No readable chapter text was found in the page HTML.');
  const fullText = best.join(' ');
  const chinese = (fullText.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
  const english = (fullText.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g) || []).length;
  const wordCount = chinese + english;
  return { url, title, paragraphs: best, wordCount, short: wordCount < 50 };
}

async function processDirectoryTargets(targets, origin, robotsCache, lastRequest) {
  const batch = targets.slice(0, BATCH_SIZE);
  const chapters = [], errors = [];
  for (const target of batch) {
    try {
      const page = await fetchHtml(target.url, origin, robotsCache, lastRequest);
      chapters.push({ ...target, ...extractFromHtml(page.html, page.finalUrl, target.title) });
    } catch (error) { errors.push({ title: target.title, url: target.url, error: error.message }); }
  }
  return { chapters, errors, remaining: targets.slice(batch.length) };
}

async function processChapterChain(startUrl, origin, visitedInput = [], robotsCache = new Map(), lastRequest = { value: 0 }) {
  const visited = new Set(visitedInput);
  const chapters = [], errors = [];
  let current = startUrl;
  let nextUrl = null;
  const batchLimit = Math.min(BATCH_SIZE, Math.max(0, 250 - visited.size));
  for (let i = 0; i < batchLimit && current && !visited.has(current); i++) {
    try {
      const page = await fetchHtml(current, origin, robotsCache, lastRequest);
      visited.add(current);
      const $ = cheerio.load(page.html);
      const title = titleOf($, `Chapter ${visited.size}`);
      chapters.push({ number: numberOf(title), title, ...extractFromHtml(page.html, page.finalUrl, title) });
      nextUrl = findNext($, page.finalUrl);
      if (!nextUrl || new URL(nextUrl).hostname !== new URL(origin).hostname || visited.has(nextUrl)) { nextUrl = null; break; }
      current = nextUrl;
    } catch (error) {
      errors.push({ title: current, url: current, error: error.message });
      nextUrl = null;
      break;
    }
  }
  if (visited.size >= 250) nextUrl = null;
  return { chapters, errors, nextUrl, visited: [...visited] };
}

export async function analyzeSource(inputUrl) {
  const source = validateSourceUrl(inputUrl);
  const origin = source.origin;
  const robotsCache = new Map();
  const lastRequest = { value: 0 };
  const first = await fetchHtml(source.href, origin, robotsCache, lastRequest);
  const $ = cheerio.load(first.html);
  const sourceTitle = titleOf($, source.hostname);
  const directoryLinks = findDirectoryLinks(first.html, first.finalUrl);
  if (directoryLinks.length >= 2) {
    const boundedLinks = directoryLinks.slice(0, 250);
    const result = await processDirectoryTargets(boundedLinks, origin, robotsCache, lastRequest);
    return {
      sourceUrl: source.href, sourceTitle, mode: 'directory', discovered: boundedLinks.length,
      chapters: result.chapters, errors: result.errors,
      cursor: result.remaining.length ? { mode: 'directory', origin, remaining: result.remaining } : null
    };
  }
  const firstChapter = { number: numberOf(sourceTitle), title: sourceTitle, ...extractFromHtml(first.html, first.finalUrl, sourceTitle) };
  const nextUrl = findNext($, first.finalUrl);
  let chain = { chapters: [firstChapter], errors: [], nextUrl, visited: [first.finalUrl] };
  if (nextUrl && new URL(nextUrl).hostname === source.hostname) {
    const more = await processChapterChain(nextUrl, origin, chain.visited, robotsCache, lastRequest);
    chain = { chapters: [...chain.chapters, ...more.chapters], errors: more.errors, nextUrl: more.nextUrl, visited: more.visited };
  }
  return {
    sourceUrl: source.href, sourceTitle, mode: 'chapter', discovered: chain.chapters.length + (chain.nextUrl ? 1 : 0),
    chapters: chain.chapters, errors: chain.errors,
    cursor: chain.nextUrl ? { mode: 'chapter', origin, nextUrl: chain.nextUrl, visited: chain.visited } : null
  };
}

export async function continueSource(cursor) {
  if (!cursor || !['directory', 'chapter'].includes(cursor.mode)) throw new Error('There are no more chapters to load.');
  const originUrl = validateSourceUrl(cursor.origin);
  const origin = originUrl.origin;
  const robotsCache = new Map();
  const lastRequest = { value: 0 };
  if (cursor.mode === 'directory') {
    if (!Array.isArray(cursor.remaining)) throw new Error('Invalid continuation data.');
    const result = await processDirectoryTargets(cursor.remaining, origin, robotsCache, lastRequest);
    return { chapters: result.chapters, errors: result.errors, cursor: result.remaining.length ? { ...cursor, remaining: result.remaining } : null };
  }
  const next = validateSourceUrl(cursor.nextUrl);
  if (next.hostname !== originUrl.hostname) throw new Error('The next page is outside the original website.');
  const result = await processChapterChain(next.href, origin, Array.isArray(cursor.visited) ? cursor.visited.slice(-300) : [], robotsCache, lastRequest);
  return { chapters: result.chapters, errors: result.errors, cursor: result.nextUrl ? { mode: 'chapter', origin, nextUrl: result.nextUrl, visited: result.visited.slice(-300) } : null };
}
