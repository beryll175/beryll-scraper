export function selectAll(chapters, selected = true) {
  return chapters.map(chapter => ({ ...chapter, selected }));
}

export function selectRange(chapters, start, end, selected = true) {
  const from = Number(start);
  const to = Number(end);

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < 1 ||
    from > chapters.length ||
    to > chapters.length
  ) {
    throw new Error(
      `Enter a valid chapter range between 1 and ${chapters.length}.`
    );
  }

  const first = Math.min(from, to) - 1;
  const last = Math.max(from, to) - 1;

  return chapters.map((chapter, index) => ({
    ...chapter,
    selected: selected
      ? index >= first && index <= last
      : index >= first && index <= last
        ? false
        : chapter.selected
  }));
}

export function getSelectedChapters(chapters) {
  return chapters.filter(chapter => chapter.selected);
}
