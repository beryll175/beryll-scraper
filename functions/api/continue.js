import { continueSource } from '../_lib/scraper.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const result = await continueSource(body.cursor);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not load more chapters.' }, { status: 422 });
  }
}
