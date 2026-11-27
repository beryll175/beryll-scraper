/** Canonical records shared by adapters, the UI, storage and exporters. */

export function createNovelSession(input = {}) {
  const now = new Date().toISOString();

  return {
    sourceUrl: input.sourceUrl || '',
    sourceId: input.sourceId || '',
    title: input.title || 'Untitled Novel',
    author: input.author || '',
    description: input.description || '',
    language: input.language || 'en',
    adapterId: input.adapterId || 'unknown',
    chapters: [],
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeChapter(input = {}, index = 0) {
  const paragraphs = Array.isArray(input.paragraphs)
    ? input.paragraphs.map(value => String(value ?? '').trim()).filter(Boolean)
    : String(input.text ?? '')
        .split(/\r?\n\s*\r?\n/)
        .map(value => value.trim())
        .filter(Boolean);

  const text = String(input.text ?? paragraphs.join('\n\n')).trim();

  const count = text.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || [];

  return {
    id: String(input.id || input.url || `chapter-${index + 1}`),
    number: input.number !== null &&
      input.number !== undefined &&
      input.number !== '' &&
      Number.isFinite(Number(input.number))
        ? Number(input.number)
        : null,
    title: input.title === ''
      ? ''
      : String(input.title || `Chapter ${index + 1}`).trim(),
    url: String(input.url || ''),
    text,
    paragraphs,
    wordCount: Number.isFinite(input.wordCount)
      ? input.wordCount
      : count.length,
    selected: input.selected !== false,
    status: input.status || (text ? 'extracted' : 'discovered'),
    warnings: Array.isArray(input.warnings) ? [...input.warnings] : [],
    error: input.error ? String(input.error) : '',
    sourceMetadata: input.sourceMetadata &&
      typeof input.sourceMetadata === 'object'
        ? { ...input.sourceMetadata }
        : {}
  };
}

export function normalizeChapters(chapters = []) {
  const normalized = [];
  const usedIds = new Set();

  for (const [index, raw] of chapters.entries()) {
    const chapter = normalizeChapter(raw, index);

    let id = chapter.id;

    if (usedIds.has(id)) {
      let suffix = 2;

      while (usedIds.has(`${id}::copy-${suffix}`)) {
        suffix++;
      }

      id = `${id}::copy-${suffix}`;
    }

    usedIds.add(id);

    normalized.push({
      ...chapter,
      id
    });
  }

  return normalized;
      }
