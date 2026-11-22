# Beryll Scraper — Xbanxia browser build

Beryll Scraper is a browser-only extraction tool for Xbanxia. It is intentionally separate from Beryll TL. The static app is hosted on GitHub Pages; chapter requests are made by a bookmarklet running on the source page, and chapter text is stored locally in the browser's IndexedDB.

## Included

- Xbanxia novel-directory parsing using selectors confirmed against the supplied rendered page (`.book-describe h1`, `.book-describe p a`, `.describe-html`, `.book-list ul li a[href]`).
- Individual chapter extraction using `#nr_title` and `#nr1`, with injected scripts, iframes, navigation and detected advertising containers removed while preserving paragraph breaks.
- Same-origin page-fetch bridge. The bookmarklet refuses to fetch URLs outside the source page's origin.
- Directory pagination discovery where a next-page link is exposed; duplicate URLs are removed while retaining source order.
- Chapter list with individual selection, select all/none and one-based inclusive range selection.
- Sequential extraction, pause-after-current-chapter, resume, retry-failed, progress display and per-chapter errors.
- Short-chapter warnings and default deselection; validation for possible numbering gaps, duplicate chapter numbers, failed/empty chapters and pending work.
- IndexedDB recovery of novel details, extracted text, selections and chapter statuses. Relaunch the bookmarklet on the source novel page to reconnect after reopening the app.
- TXT, DOCX and EPUB 3 exports. Export only selected chapters with extracted text, in source order. Optional novel title/author metadata can be included or omitted.
- Responsive black/orange interface.

## Install / host

1. Upload the contents of this folder to a GitHub repository named `beryll-scraper-browser` (or change the path in `bookmarklet.txt` to match your repository).
2. In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.
3. Wait for GitHub Pages to publish the site.
4. Open `bookmarklet.txt`, replace `YOUR_GITHUB_USERNAME` with your GitHub username, copy the complete `javascript:` line, and create a Chrome bookmark with that line as its URL.
5. Open an Xbanxia novel directory page, tap the bookmark, then tap **Inspect page**.
6. Select chapters and choose **Extract chapters**. Export selected completed chapters as TXT, DOCX or EPUB.

If you change the repository name or Pages URL, update the `APP` constant in `bookmarklet.txt` before creating the bookmark.

## Recovery

The app saves its active session in IndexedDB for the GitHub Pages origin. If the browser or app closes, reopen the source novel page and launch the bookmarklet again. The saved chapter list and extracted text should be restored; the fresh bookmarklet launch reconnects the page-fetch bridge. Clearing browser site data, changing browser profile or using another browser can remove/hide the saved session. **Clear session** deletes the saved local session.

## Export behavior

- **TXT:** UTF-8 plain text with chapter headings; optional title and author header.
- **DOCX:** Word Open XML document with title/author metadata, chapter headings, paragraph spacing and page breaks between chapters.
- **EPUB:** EPUB 3 package with `mimetype` first and uncompressed, package metadata, navigation table of contents, stylesheet and one XHTML file per chapter.
- Filename is sanitized for common filesystem restrictions. Only selected chapters with non-empty extracted text are exported.

## Scope and limitations

- This build supports Xbanxia only. Beryll TL integration and Omni extraction are deliberately excluded from this project scope. Generic HTML is not advertised as supported.
- The bridge can fetch only pages on the same origin as the source page. It does not bypass logins, paywalls, access controls, anti-bot restrictions or browser security rules.
- If Xbanxia changes its markup, blocks a request or inserts a new type of advertisement, extraction may fail or require adapter updates. Review the validation report and sample the exported text.
- Directory pagination depends on a discoverable next-page link. The supplied novel page contains all 114 chapter links in one directory.
- Validation is advisory. Numbering gaps and duplicate numbers may be legitimate extras, so nothing is silently deleted.
- No live end-to-end extraction has been performed against Xbanxia in this build environment. Automated tests cover the core, validation logic, adapter helpers and export package structure; browser/source-site testing remains necessary before relying on a full novel export.

## Development

Requires a modern browser and Node.js 18+ for tests.

```sh
npm test
```

The project uses native browser APIs and has no runtime package dependencies.
