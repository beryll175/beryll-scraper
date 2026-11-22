import { createExport, safeFilename } from '../../src/exporters/memory.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const format = String(body.format || '').toLowerCase();
    const allowed = ['txt', 'docx', 'epub'];
    if (!allowed.includes(format)) return Response.json({ error: 'Unsupported export format.' }, { status: 400 });
    if (!Array.isArray(body.chapters) || body.chapters.length === 0) return Response.json({ error: 'Select at least one chapter.' }, { status: 400 });
    if (body.chapters.length > 250) return Response.json({ error: 'An export can contain at most 250 chapters.' }, { status: 400 });
    const novel = {
      title: String(body.title || 'Beryll Export').slice(0, 200),
      author: String(body.author || '').slice(0, 120),
      language: String(body.language || 'en').slice(0, 20)
    };
    const chapters = body.chapters.map(chapter => ({
      title: String(chapter.title || 'Untitled Chapter').slice(0, 300),
      paragraphs: Array.isArray(chapter.paragraphs) ? chapter.paragraphs.map(p => String(p).slice(0, 30000)) : []
    }));
    const estimatedSize = chapters.reduce((sum, chapter) => sum + chapter.paragraphs.join('').length, 0);
    if (estimatedSize > 8_000_000) return Response.json({ error: 'The selected content is too large for one export. Select fewer chapters.' }, { status: 413 });
    const output = await createExport(format, novel, chapters);
    const filename = `${safeFilename(body.filename || novel.title)}.${output.extension}`;
    return new Response(output.buffer, {
      status: 200,
      headers: {
        'Content-Type': output.mime,
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Export failed.' }, { status: 422 });
  }
}
