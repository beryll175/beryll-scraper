export function selectAll(chapters, selected = true) {
  return chapters.map(chapter => ({ ...chapter, selected }));
}

export function selectRange(chapters, start, end, selected = true) {
  const first = Math.max(1, Math.min(Number(start), Number(end))) - 1;
  const last = Math.min(chapters.length, Math.max(Number(start), Number(end)));
  if (!Number.isInteger(first) || !Number.isInteger(last) || last < first + 1) {
    throw new Error('Enter a valid chapter range.');
  }
  return chapters.map((chapter, index) => ({
    ...chapter,
    selected: index >= first && index < last ? selected : chapter.selected
  }));
}

export function getSelectedChapters(chapters) {
  return chapters.filter(chapter => chapter.selected);
}
