export async function onRequestGet() {
  return Response.json({ ok: true, app: 'Beryll Scraper', platform: 'Cloudflare Pages Functions' }, { headers: { 'Cache-Control': 'no-store' } });
}
