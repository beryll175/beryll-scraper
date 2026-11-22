# Architecture

## Runtime

1. `bookmarklet.txt` runs in the source page, creates the overlay iframe and sends the current rendered HTML snapshot to the static app.
2. `src/bridge.js` receives the snapshot and provides request/response messaging for source-origin fetches.
3. `src/adapters/xbanxia.js` parses directory and chapter documents.
4. `src/app.js` coordinates inspection, discovery, extraction, selection, validation, persistence and export.
5. `src/core/` contains normalized records, selection helpers, validation and IndexedDB persistence.
6. `src/exporters/` creates TXT, DOCX and EPUB files locally.

## Security boundary

The hosted app cannot read the source page DOM directly because it is cross-origin. The bookmarklet executes in the source page and exposes only a constrained fetch bridge. The bookmarklet validates every requested URL against `location.origin` before fetching. The app does not send chapter text to a Beryll server.

## Persistence

The active novel session is stored in IndexedDB at the app origin. The source-page bridge is ephemeral and must be reconnected by launching the bookmarklet again. Storage failures fall back to in-memory state; browser storage may be cleared by the user or browser.

## Source adapter contract

The active supported adapter is Xbanxia. Its selectors are grounded in user-supplied rendered HTML. It returns normalized chapter entries and removes detected ad/script/embed elements from cloned chapter content before text extraction. URL deduplication preserves the source's listed order.

## Deliberate exclusions

No server, Cloudflare Worker, Beryll TL integration, Omni adapter or generalized all-sites crawler is included. Cross-origin fetching is not promised. Additional adapters require their own supplied source samples and verified extraction logic.
