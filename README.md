# Beryll Scraper

Beryll Scraper is a browser-based novel extraction tool that supports multiple Chinese novel websites.

The application runs as a static web app hosted on GitHub Pages. A bookmarklet launched from the source website connects the page to the scraper and handles chapter requests.

Extracted chapters, selections, and session progress are stored locally in the browser using IndexedDB. No chapter content is uploaded to a Beryll server.

## Supported Websites

The current adapters support:

- Xbanxia
- Full Novel Website (quanben-xiaoshuo.com)
- Novel543
- Hetushu / Hetubook
- CZBooks / 小說狂人
- 52书库

Each website has its own adapter for identifying novel directories, chapter links, and readable chapter content.

Generic HTML detection is included internally but is not advertised as a supported extraction source.

## Features

- Website-specific novel directory and chapter detection.
- Chapter extraction with advertisement and navigation cleanup.
- Directory pagination discovery where supported by the website adapter.
- Chapter selection with individual checkboxes, select all, select none, and range selection.
- Sequential extraction with progress tracking.
- Pause and resume extraction.
- Retry failed chapters.
- Automatic retries for failed page requests, with a limited number of attempts.
- Split-chapter detection and continuation merging where supported.
- Short-chapter warnings and default deselection.
- Validation for possible numbering gaps, duplicate chapter numbers, failed chapters, empty chapters, and pending work.
- Local session recovery through IndexedDB.
- TXT, DOCX, and EPUB 3 exports where supported by the selected adapter.
- Responsive black-and-orange interface.

## Installation and Hosting

1. Upload the project files to your GitHub repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)`.
5. Save and wait for GitHub Pages to publish the application.
6. Open `bookmarklet.txt`.
7. Copy the complete `javascript:` line.
8. Create a browser bookmark and paste the line into its URL field.
9. Open a supported novel website and launch the bookmarklet.
10. Select **Inspect page** in the scraper.

Select the chapters you want and choose **Extract chapters**.

If the repository name or GitHub Pages address changes, update the `APP` constant in `bookmarklet.txt`.

## Session Recovery

The application saves the active session in IndexedDB under the GitHub Pages origin.

If the browser or app closes:

1. Reopen the source novel page.
2. Launch the bookmarklet again.
3. The scraper reconnects to the source page.
4. Your saved chapter list, extracted text, selections, and chapter statuses can be restored.

Clearing browser site data, changing browser profiles, or using another browser may make the saved session unavailable.

The **Clear session** button deletes the saved local session.

## Export Formats

### TXT
UTF-8 plain-text export with chapter headings and optional novel metadata.

### DOCX
Microsoft Word document with chapter headings, paragraph spacing, and page breaks between chapters.

### EPUB
EPUB 3 package with metadata, navigation table of contents, stylesheet, and individual XHTML chapter files.

Only selected chapters with extracted text are exported.

Some adapters support a limited set of export formats.

## Technical Details

- Static browser application.
- JavaScript ES modules.
- Native browser APIs.
- IndexedDB for local session storage.
- Bookmarklet-based source-page communication.
- No runtime package dependencies.
- Node.js 18+ required for automated tests.

Run tests with:

```bash
npm test
