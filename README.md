# Beryll Scraper

> A browser-based tool for extracting chapters from supported Chinese novel websites.

It runs directly in your browser and allows you to discover, select, extract, and export novel chapters without uploading your extracted content to a Beryll server.

**[🚀 Open Beryll Scraper](https://beryll175.github.io/beryll-scraper/)**

---

## 🌐 Supported Websites

The currently configured adapters support:

- Xbanxia
- Full Novel Website (quanben-xiaoshuo.com)
- Novel543
- Hetushu / Hetubook
- CZBooks / 小說狂人
- 52书库

Website support depends on the site's page structure and adapter configuration.

---

## ✨ Features

- Automatic novel and chapter detection.
- Chapter directory pagination discovery where supported.
- Individual chapter selection.
- Select all and select none.
- Chapter range selection.
- Sequential chapter extraction.
- Pause and resume extraction.
- Retry failed chapters.
- Automatic retries for failed page requests.
- Split-chapter detection and continuation merging where supported.
- Short-chapter warnings.
- Detection of possible numbering gaps and duplicate chapter numbers.
- Local session recovery using IndexedDB.
- TXT, DOCX, and EPUB exports where supported.
- Responsive black-and-orange interface.

---

## 🚀 Getting Started

You do not need to install the application itself. Beryll Scraper is hosted on GitHub Pages.

You only need to install its bookmarklet.

### Step 1: Open the Scraper

Visit:

https://beryll175.github.io/beryll-scraper/

### Step 2: Get the Bookmarklet

1. Open the [Beryll Scraper repository](https://github.com/beryll175/beryll-scraper).
2. Open `bookmarklet.txt`.
3. Copy the complete line of code beginning with `javascript:`.

### Step 3: Create a Browser Bookmark

1. Create a new bookmark in your browser.
2. Name it **Beryll Scraper**.
3. Paste the copied code into the bookmark's URL or address field.
4. Save the bookmark.

> **Important:** Make sure the code goes into the URL field, not the bookmark name.

### Step 4: Start Scraping

1. Visit a supported novel website.
2. Open the novel's chapter directory or table of contents.
3. Launch the Beryll Scraper bookmarklet.
4. Select **Inspect page**.
5. Review the discovered chapters.
6. Select the chapters you want.
7. Select **Extract chapters**.

### Step 5: Export

Once extraction is complete, choose your preferred format:

- **TXT**
- **DOCX**
- **EPUB**

Only selected chapters with successfully extracted text are exported.

---

## 📖 Full User Guide

For detailed instructions, including bookmarklet installation, extraction, exporting, session recovery, and troubleshooting, see:

**[Beryll Scraper Installation & User Guide](docs/USER_GUIDE.md)**

---

## 🔒 Privacy and Saved Sessions

Beryll Scraper uses IndexedDB to save sessions locally in your browser.

- Extracted chapters are stored on your device.
- Your sessions are separate from those of other users.
- Your extracted content is not uploaded to a Beryll server.
- Sessions may be lost if browser site data is cleared or you switch browsers or browser profiles.

Use **Clear session** to delete your saved session.

---

## ⚙️ Technical Details

- Static browser application.
- JavaScript ES modules.
- Native browser APIs.
- IndexedDB for local storage.
- Bookmarklet-based source-page communication.
- No runtime package dependencies.
- Node.js 18+ required for automated tests.

Run tests with:

```bash
npm test
```

---

## 🔄 Updates

Beryll Scraper is hosted on GitHub Pages. Updates to the project become available to users when GitHub Pages publishes the latest changes.

---

*Beryll Scraper is an independent browser-based project. Website support may change as adapters are added or updated.*
