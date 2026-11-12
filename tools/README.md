# Site tools (not part of the public site)

No build step. Pages are plain HTML. These two scripts keep them consistent.

- `node tools/sync-chrome.mjs` copies `tools/partials/header.html` and `footer.html` into every page that uses `assets/venue.css`, and marks the current menu item. Edit the partial, run it, and every page is updated. `--check` only reports differences.
- `node tools/qa.mjs` serves the site locally and opens every page at 375 px and 1280 px. It fails on console errors, missing files, horizontal scroll, broken internal links or anchors, a missing title/description/canonical, more or fewer than one `<h1>`, or a commercial page without the "not legal advice" line. `--shots DIR` saves full-page screenshots.

Run both before every publish. Playwright is used from the global install.
