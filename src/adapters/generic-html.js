export const genericAdapter = {
  id: 'generic-html',
  label: 'Generic HTML',
  matches: url => url.protocol === 'http:' || url.protocol === 'https:',
  inspect(document, location) {
    const title = document.querySelector('h1')?.textContent?.trim() || document.title || location.hostname;
    const text = [...document.querySelectorAll('article p, main p')]
      .map(node => node.textContent.trim()).filter(Boolean).join('\n\n');
    return { kind: text ? 'chapter' : 'unknown', title, text, chapters: [] };
  }
};
