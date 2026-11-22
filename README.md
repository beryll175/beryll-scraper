# Beryll Scraper — Cloudflare Pages Edition

A mobile-first chapter analysis and export workspace. This edition is designed for Cloudflare Pages with Pages Functions. The browser holds the active extraction session in memory; no chapter archive, account database, KV namespace, Durable Object, or R2 bucket is required.

## Deploy with Cloudflare Pages and GitHub

1. Create a GitHub repository for this project and upload the contents of this folder (the `public`, `functions`, and `src` folders, `package.json`, lockfile, and `wrangler.toml`). Do not upload `node_modules`, `downloads`, or private test data.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the Beryll Scraper GitHub repository.
4. Use these build settings:
   - Framework preset: **None**
   - Build command: leave blank
   - Build output directory: `public`
   - Root directory: `/`
5. Deploy. Pages automatically detects the `functions/` directory at the repository root. The `wrangler.toml` enables `nodejs_compat` for the DOCX/EPUB libraries.
6. Open the generated `*.pages.dev` address and test `/api/health` after deployment.

If Cloudflare's dashboard asks for a build command, leave it empty. The app is static HTML/CSS/JS plus Pages Functions; no frontend build step is required.

## Local Pages preview (optional)

Install dependencies, then use Wrangler:

```bash
npm install
npx wrangler pages dev public
```

The Pages Functions are served alongside the static files. The older Node server remains available with `npm start` for local development, but the Cloudflare deployment does not use it.

## Use

1. Paste one novel-directory URL or one chapter URL.
2. Beryll checks the page, follows same-site chapter links or the explicit next-chapter link, and extracts readable HTML text.
3. Results appear in a selectable table. Short chapters remain visible and start unchecked.
4. Use individual checkboxes, Select All/None, or ranges such as `1-10,15,18-25`.
5. Select TXT, DOCX, or EPUB. You can export repeatedly without fetching the source again while the browser tab remains open.
6. Directory and chapter-chain scraping runs in batches of 10 to fit Cloudflare request-duration limits. Use **Load next 10 chapters** to continue. The active list and chapter text stay in the current page's memory.

## Bookmarklet

After deployment, create a browser bookmark named **Send to Beryll Scraper**. Replace `YOUR-PROJECT.pages.dev` with the actual Pages hostname and use this as the bookmark URL:

```javascript
javascript:(()=>{location.href='https://YOUR-PROJECT.pages.dev/?url='+encodeURIComponent(location.href)})()
```

When tapped on a source page, the bookmarklet opens the hosted app and passes the current page URL. It does not run the scraper inside the source page; the Cloudflare Pages Function fetches the URL. The source site must permit the request and expose readable HTML to the server.

## Temporary session and privacy

- Extracted chapters are returned to the browser and held in the page's JavaScript memory.
- Exports are generated on demand and returned as downloads; they are not written to a server disk or stored in GitHub.
- Clear session removes the active chapter list from the page.
- Reloading or closing the tab discards the in-memory session. Do not rely on a browser tab as permanent storage.
- The source URL and chapter text are sent to the Cloudflare Pages Function to perform extraction/export. Cloudflare processes those requests as the hosting provider; this is not an offline/local-only app.

## Limits and access

- Each request processes up to 10 chapters, then offers a continuation button. This is designed to reduce Cloudflare request timeouts.
- Each fetched HTML page is limited to 5 MB; an individual export request is limited to 8 MB of text and 250 chapters.
- The scraper uses ordinary HTTP requests, follows same-host redirects only, checks `robots.txt`, and waits at least one second between page requests in a batch.
- It does not execute page JavaScript or bypass logins, paywalls, CAPTCHAs, or access controls. Some sites may block Cloudflare-origin requests or require browser rendering; those sites will not work with this version.
- Use it only for public-domain/openly licensed material, content you own, or material you are authorised to access and reproduce. Buying access to a text does not itself grant translation or republication rights. Respect source-site terms and applicable law.

## Project layout

- `public/` — responsive browser interface
- `functions/api/` — Cloudflare Pages API endpoints
- `functions/_lib/scraper.js` — server-side page discovery and extraction
- `src/exporters/` — TXT, DOCX and EPUB export generation
- `src/` — original Node CLI and local-development engine
