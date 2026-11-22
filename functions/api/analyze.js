import { analyzeSource } from '../_lib/scraper.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const url = String(body.url || '').trim();
    if (!url) return Response.json({ error: 'Paste a novel or chapter URL first.' }, { status: 400 });
    const result = await analyzeSource(url);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Analysis failed.' }, { status: 422 });
  }
}
