/** Canonical records shared by adapters, the UI, storage and exporters. */
export function createNovelSession(input = {}) {
  const now = new Date().toISOString();
  return {sourceUrl:input.sourceUrl||'',sourceId:input.sourceId||'',title:input.title||'Untitled Novel',author:input.author||'',description:input.description||'',language:input.language||'en',adapterId:input.adapterId||'unknown',chapters:[],createdAt:now,updatedAt:now};
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
export function normalizeChapters(chapters=[]){const seen=new Set(),normalized=[];for(const[index,raw]of chapters.entries()){const chapter=normalizeChapter(raw,index),key=chapter.url||chapter.id;if(seen.has(key))continue;seen.add(key);normalized.push(chapter);}return normalized;}
