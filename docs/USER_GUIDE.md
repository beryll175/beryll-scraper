# Beryll Scraper

## Installation and User Guide

Beryll Scraper is a browser-based tool for extracting chapters from
supported Chinese novel websites. It runs in your browser and saves your
work locally on your device.

**Scraper:** https://beryll175.github.io/beryll-scraper/

## 1. Supported websites

The currently configured adapters support:

-   Xbanxia
-   Full Novel Website (quanben-xiaoshuo.com)
-   Novel543
-   Hetushu / Hetubook
-   CZBooks / 小說狂人
-   52书库

Support can vary by website and page layout. If a website is not listed,
it may not work correctly with the scraper yet.

## 2. What you need

-   A browser that supports bookmarks/bookmarklets and JavaScript.
-   Access to one of the supported novel websites.
-   An internet connection to load the scraper and retrieve chapter
    pages.

## 3. Install the bookmarklet

The bookmarklet is a small piece of JavaScript that connects the novel
website you're viewing to Beryll Scraper.

1.  Open the Beryll Scraper GitHub repository:
    https://github.com/beryll175/beryll-scraper
2.  Open the file named **bookmarklet.txt**.
3.  Copy the entire line of code beginning with `javascript:`.
4.  Create a new bookmark in your browser.
5.  Give it a name such as **Beryll Scraper**.
6.  Edit the bookmark and paste the copied code into its **URL**,
    **Address**, or **Location** field.
7.  Save the bookmark.

**Important:** Paste the code into the bookmark's URL/address field, not
the bookmark's name field. Make sure you copy the complete `javascript:`
line.

## 4. Launch the scraper

1.  Visit a supported novel website.
2.  Open the novel's chapter directory or table-of-contents page.
3.  Tap or click the **Beryll Scraper** bookmark you created. (To open the bookmark, click the url the page you're on and type the name of the bookmark i.e Beryll Scraper. Tap the bookmark.) 
4.  The scraper interface should open over the page.
5.  If the interface does not appear, check that the bookmarklet was
    copied completely and that your browser allows bookmarklets to run.

## 5. Inspect a novel

1.  In the scraper, check the **Current page** field.
2.  Select **Inspect page**.
3.  Wait for the scraper to identify the novel information and chapter
    list.
4.  Review the discovered chapters before extracting them.

If the page is not recognized, confirm that it belongs to a supported
website and that you launched the bookmarklet from the novel's directory
page.

## 6. Select and extract chapters

-   Use the checkbox beside each chapter to choose what you want.
-   Select **Select all** to select every discovered chapter.
-   Select **Select none** to clear the selection.
-   Use the **From** and **To** fields with **Select range** to select a
    chapter range.
-   Short chapters may be left unchecked by default. Review the
    selection before starting.

When ready, select **Extract chapters**.

The scraper processes chapters sequentially. You can use **Pause** to
pause extraction and **Retry failed** to try chapters that did not
download successfully.

Some websites may respond slowly or temporarily fail to load. The
scraper automatically retries failed page requests a limited number of
times.

## 7. Export your chapters

After extraction, enter a filename if you want to change the default
name.

Choose an export format:

-   **TXT** -- plain text.
-   **DOCX** -- Microsoft Word document.
-   **EPUB** -- EPUB ebook.

Only selected chapters with successfully extracted text are included.
Some export formats may not be available for every adapter.

You can also choose whether to include the novel title and author in the
export.

## 8. Saved sessions and privacy

Beryll Scraper saves the current session in your browser using
IndexedDB.

This can include your discovered chapter list, selections, extracted
text, and chapter statuses. If you close the scraper, you may be able to
restore your session by reopening the source novel page and launching
the bookmarklet again.

-   Your saved session belongs to your browser on your device.
-   Other users cannot see your saved sessions.
-   Your extracted chapters are not uploaded to a Beryll server.
-   Clearing browser site data, changing browsers, or using a different
    browser profile may make your saved session unavailable.
-   **Clear session** deletes the saved local session.

## 9. Troubleshooting

**The bookmarklet does nothing** - Check that the complete code,
including `javascript:`, was pasted into the bookmark's URL field. - Try
launching it while viewing a supported novel website. - Check whether
your browser blocks bookmarklets.

**The scraper opens but does not recognize the page** - Open the novel's
chapter directory or table-of-contents page first. - Confirm that the
website is on the supported list. - Select **Inspect page** again.

**Some chapters fail** - Wait for extraction to finish, then select
**Retry failed**. - The source website may be temporarily unavailable or
may have changed its page structure.

**My previous session is missing** - Reopen the same source novel page
and launch the bookmarklet again. - Make sure you're using the same
browser and browser profile. - Check whether browser site data was
cleared.

## 10. Updates

Beryll Scraper is hosted on GitHub Pages. When the project is updated,
reload the scraper page to use the latest published version.

------------------------------------------------------------------------

Beryll Scraper is an independent browser-based tool. Website support may
change as adapters are added or updated.
