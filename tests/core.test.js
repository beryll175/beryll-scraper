import test from 'node:test';
import assert from 'node:assert/strict';
import { createNovelSession, normalizeChapter, normalizeChapters } from '../src/core/model.js';
import { selectAll, selectRange, getSelectedChapters } from '../src/core/selection.js';
import { createSessionStore } from '../src/core/session-store.js';

test('creates a novel session with safe defaults', () => {
  const session = createNovelSession();
  assert.equal(session.title, 'Untitled Novel');
  assert.equal(session.language, 'en');
  assert.deepEqual(session.chapters, []);
});

test('normalizes chapter text and preserves unknown chapter number as null', () => {
  const chapter = normalizeChapter({ title: 'Chapter 1', text: 'First paragraph.\n\nSecond paragraph.' });
  assert.equal(chapter.number, null);
  assert.deepEqual(chapter.paragraphs, ['First paragraph.', 'Second paragraph.']);
  assert.equal(chapter.selected, true);
  assert.equal(chapter.wordCount, 4);
});

test('deduplicates chapters by URL', () => {
  const chapters = normalizeChapters([
    { url: 'https://example.test/ch1', title: 'One', text: 'A' },
    { url: 'https://example.test/ch1', title: 'Duplicate', text: 'B' }
  ]);
  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].title, 'One');
});

test('selects all and a one-based inclusive range', () => {
  const chapters = [1, 2, 3, 4].map(number => normalizeChapter({ number, title: `Chapter ${number}`, text: 'text' }));
  const none = selectAll(chapters, false);
  const range = selectRange(none, 2, 3);
  assert.deepEqual(getSelectedChapters(range).map(ch => ch.number), [2, 3]);
});

test('session store clears in-memory session', () => {
  const store = createSessionStore();
  const session = createNovelSession({ title: 'Test' });
  store.set(session);
  assert.equal(store.get().title, 'Test');
  store.clear();
  assert.equal(store.get(), null);
});
