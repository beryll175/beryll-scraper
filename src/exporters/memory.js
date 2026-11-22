const { zipSync, strToU8 } = require('fflate');
const crypto = require('crypto');
const { Document, Packer, Paragraph, HeadingLevel } = require('docx');

function safeFilename(value) {
  const cleaned = String(value || 'Beryll_Scraper_Export')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 100);
  return cleaned || 'Beryll_Scraper_Export';
}
function xml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function textBuffer(novel, chapters) {
  const body = [`${novel.title || 'Untitled'}`, novel.author ? `Author: ${novel.author}` : '', '', ...chapters.flatMap((c, i) => [c.title || `Chapter ${i + 1}`, '', ...(c.paragraphs || []), ''])].filter((v, i, a) => !(v === '' && a[i - 1] === ''));
  return Buffer.from(body.join('\n'), 'utf8');
}
function epubBuffer(novel, chapters) {
  const files = { mimetype: strToU8('application/epub+zip') };
  files['META-INF/container.xml'] = strToU8('<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const manifest = [], spine = [], nav = [];
  chapters.forEach((c, i) => {
    const id = `chapter-${i + 1}`, file = `${id}.xhtml`, title = c.title || `Chapter ${i + 1}`;
    const paras = (c.paragraphs || []).map(p => `<p>${xml(p)}</p>`).join('');
    files[`OEBPS/${file}`] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xml(title)}</title></head><body><h1>${xml(title)}</h1>${paras}</body></html>`);
    manifest.push(`<item id="${id}" href="${file}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${id}"/>`);
    nav.push(`<li><a href="${file}">${xml(title)}</a></li>`);
  });
  files['OEBPS/nav.xhtml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${nav.join('')}</ol></nav></body></html>`);
  manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
  files['OEBPS/content.opf'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${crypto.randomUUID()}</dc:identifier><dc:title>${xml(novel.title || 'Untitled')}</dc:title><dc:creator>${xml(novel.author || 'Unknown')}</dc:creator><dc:language>${xml(novel.language || 'en')}</dc:language></metadata><manifest>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`);
  return Buffer.from(zipSync(files, { level: 0 }));
}
async function docxBuffer(novel, chapters) {
  const children = [new Paragraph({ text: novel.title || 'Untitled', heading: HeadingLevel.TITLE })];
  if (novel.author) children.push(new Paragraph({ text: `Author: ${novel.author}` }));
  chapters.forEach((c, i) => {
    children.push(new Paragraph({ text: c.title || `Chapter ${i + 1}`, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    (c.paragraphs || []).forEach(p => children.push(new Paragraph({ text: String(p) })));
  });
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
async function createExport(format, novel, chapters) {
  if (!chapters.length) throw new Error('Select at least one chapter.');
  if (format === 'txt') return { buffer: textBuffer(novel, chapters), mime: 'text/plain; charset=utf-8', extension: 'txt' };
  if (format === 'epub') return { buffer: epubBuffer(novel, chapters), mime: 'application/epub+zip', extension: 'epub' };
  if (format === 'docx') return { buffer: await docxBuffer(novel, chapters), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' };
  throw new Error('Unsupported export format.');
}
module.exports = { createExport, safeFilename };
