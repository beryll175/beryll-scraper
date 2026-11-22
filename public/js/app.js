const $ = (id) => document.getElementById(id);
let chapterData = [];
let pendingCursor = null;
let sourceTitle = 'Beryll Export';
let sourceMode = '';
let failedTotal = 0;

function status(message, type = '') {
  const el = $('status'); el.textContent = message; el.className = `status ${type}`.trim();
}
function exportStatus(message, type = '') {
  const el = $('exportStatus'); el.textContent = message; el.className = `status ${type}`.trim();
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function selectedIndexes() {
  return [...document.querySelectorAll('.chapter-check:checked')].map(el => Number(el.value));
}
function renderChapters(chapters, append = false) {
  const offset = append ? chapterData.length : 0;
  if (!append) chapterData = [];
  chapterData.push(...chapters);
  const rows = chapters.map((chapter, localIndex) => {
    const index = offset + localIndex;
    return `<tr>
      <td><input class="chapter-check" type="checkbox" value="${index}" ${chapter.short ? '' : 'checked'} aria-label="Select chapter ${index + 1}"></td>
      <td>${index + 1}</td>
      <td><div class="chapter-title">${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</div><span class="sub-url">${escapeHtml(chapter.url)}</span></td>
      <td class="length">${Number(chapter.wordCount || 0).toLocaleString()}</td>
      <td><span class="tag ${chapter.short ? 'short' : ''}">${chapter.short ? 'Short · unchecked' : 'Ready'}</span></td>
    </tr>`;
  }).join('');
  if (append) $('chapterRows').insertAdjacentHTML('beforeend', rows);
  else $('chapterRows').innerHTML = rows;
  $('chapterCount').textContent = chapterData.length;
  $('shortCount').textContent = chapterData.filter(c => c.short).length;
}
function showErrors(errors, append = false) {
  if (!errors?.length) return;
  failedTotal += errors.length;
  $('failedCount').textContent = failedTotal;
  const existing = append ? $('errors').innerHTML : '';
  const newItems = errors.slice(0, 20).map(e => `<li>${escapeHtml(e.title)} — ${escapeHtml(e.error)}</li>`).join('');
  $('errors').classList.remove('hidden');
  $('errors').innerHTML = `${existing}<ul>${newItems}</ul>`;
}
function updateCursor(cursor) {
  pendingCursor = cursor || null;
  $('loadMoreBtn').classList.toggle('hidden', !pendingCursor);
  $('loadMoreBtn').disabled = false;
  $('loadMoreBtn').textContent = pendingCursor ? 'Load next 10 chapters' : 'All discovered chapters loaded';
}

async function analyze() {
  const url = $('sourceUrl').value.trim();
  if (!url) return status('Paste a novel or chapter URL first.', 'error');
  $('analyzeBtn').disabled = true;
  $('analyzeBtn').textContent = 'Analysing…';
  $('workspace').classList.add('hidden');
  $('chapterRows').innerHTML = '';
  $('errors').classList.add('hidden');
  $('errors').innerHTML = '';
  chapterData = []; pendingCursor = null; failedTotal = 0;
  status('Checking the page, discovering chapters and extracting the first batch.');
  exportStatus('');
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({url}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    sourceTitle = data.sourceTitle || 'Beryll_Export';
    sourceMode = data.mode || '';
    renderChapters(data.chapters || []);
    $('novelTitle').textContent = sourceTitle;
    $('filename').value = sourceTitle.replace(/[<>:"/\\|?*]/g, '').trim().replace(/\s+/g, '_');
    showErrors(data.errors || []);
    updateCursor(data.cursor);
    $('workspace').classList.remove('hidden');
    const more = data.cursor ? ' More chapters are available; use Load next 10 chapters.' : '';
    status(`Loaded ${data.chapters?.length || 0} chapter(s) from the ${sourceMode || 'source'} page.${more}`, 'success');
  } catch (error) {
    status(error.message, 'error');
  } finally {
    $('analyzeBtn').disabled = false;
    $('analyzeBtn').innerHTML = 'Analyse <span>↗</span>';
  }
}

async function loadMore() {
  if (!pendingCursor) return;
  $('loadMoreBtn').disabled = true;
  $('loadMoreBtn').textContent = 'Loading…';
  status('Loading the next batch. Please keep this page open.');
  try {
    const response = await fetch('/api/continue', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({cursor: pendingCursor}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load more chapters.');
    renderChapters(data.chapters || [], true);
    showErrors(data.errors || [], true);
    updateCursor(data.cursor);
    status(`Loaded ${data.chapters?.length || 0} more chapter(s). ${chapterData.length} chapter(s) are now available.`, 'success');
  } catch (error) {
    $('loadMoreBtn').disabled = false;
    $('loadMoreBtn').textContent = 'Retry loading next batch';
    status(error.message, 'error');
  }
}

function applyRange() {
  const raw = $('rangeInput').value.trim();
  if (!raw) return exportStatus('Enter a range such as 1-10, 15, 18-25.', 'error');
  const wanted = new Set();
  try {
    for (const part of raw.split(',')) {
      const item = part.trim();
      if (/^\d+$/.test(item)) wanted.add(Number(item));
      else if (/^\d+\s*-\s*\d+$/.test(item)) {
        const [start, end] = item.split('-').map(Number);
        if (end < start || end - start > 1000) throw new Error('Invalid range.');
        for (let n = start; n <= end; n++) wanted.add(n);
      } else throw new Error('Use numbers and ranges separated by commas.');
    }
    document.querySelectorAll('.chapter-check').forEach(el => { el.checked = wanted.has(Number(el.value) + 1); });
    exportStatus(`${selectedIndexes().length} chapter(s) selected.`, 'success');
  } catch (e) { exportStatus(e.message, 'error'); }
}

async function download(format) {
  const indexes = selectedIndexes();
  if (!indexes.length) return exportStatus('Select at least one chapter.', 'error');
  const chapters = indexes.map(index => chapterData[index]).filter(Boolean);
  const filename = $('filename').value.trim() || 'Beryll_Export';
  const buttons = [...document.querySelectorAll('.download')];
  buttons.forEach(b => b.disabled = true);
  exportStatus(`Preparing ${format.toUpperCase()}…`);
  try {
    const response = await fetch('/api/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({title: sourceTitle, chapters, filename, format}) });
    if (!response.ok) {
      let message = 'Export failed.';
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const name = match ? decodeURIComponent(match[1] || match[2]) : `${filename}.${format}`;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = objectUrl; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    exportStatus(`${name} is ready. You can export another format without scraping again.`, 'success');
  } catch (error) { exportStatus(error.message, 'error'); }
  finally { buttons.forEach(b => b.disabled = false); }
}

function clearSession() {
  chapterData = []; pendingCursor = null; failedTotal = 0;
  $('workspace').classList.add('hidden'); $('chapterRows').innerHTML = '';
  $('rangeInput').value = ''; $('filename').value = ''; $('errors').classList.add('hidden');
  $('sourceUrl').value = ''; $('loadMoreBtn').classList.add('hidden');
  status('Session cleared. Extracted content has been discarded from this browser page.');
  exportStatus('');
}

$('analyzeBtn').addEventListener('click', analyze);
$('sourceUrl').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
$('selectAll').addEventListener('click', () => document.querySelectorAll('.chapter-check').forEach(el => el.checked = true));
$('selectNone').addEventListener('click', () => document.querySelectorAll('.chapter-check').forEach(el => el.checked = false));
$('applyRange').addEventListener('click', applyRange);
$('rangeInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyRange(); });
$('clearBtn').addEventListener('click', clearSession);
$('loadMoreBtn').addEventListener('click', loadMore);
document.querySelectorAll('.download').forEach(button => button.addEventListener('click', () => download(button.dataset.format)));

// Bookmarklet opens this app with ?url=<current page>.
const params = new URLSearchParams(location.search);
const incomingUrl = params.get('url');
if (incomingUrl) { $('sourceUrl').value = incomingUrl; history.replaceState({}, '', '/'); analyze(); }
