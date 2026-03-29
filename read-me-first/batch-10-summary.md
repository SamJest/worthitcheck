# WorthItCheck Batch 10

This batch adds a shareable exact-result layer across all 6 live tools.

## What is included
- Copy exact result link button on every live tool
- Encoded URL state for each tool result
- Automatic restore and rerun when someone opens a shared result link
- Small result-section UI update for the new secondary action button
- Shared helper functions in `tools/tooling.js`

## Files in this batch
- `styles.css`
- `tools/tooling.js`
- `tools/should-i-upgrade/index.html`
- `tools/should-i-upgrade/tool.js`
- `tools/buy-or-wait/index.html`
- `tools/buy-or-wait/tool.js`
- `tools/lease-or-buy-car/index.html`
- `tools/lease-or-buy-car/tool.js`
- `tools/new-or-used-car/index.html`
- `tools/new-or-used-car/tool.js`
- `tools/rent-vs-buy/index.html`
- `tools/rent-vs-buy/tool.js`
- `tools/trade-in-or-keep-your-phone/index.html`
- `tools/trade-in-or-keep-your-phone/tool.js`
- `read-me-first/batch-10-summary.md`

## Notes
- These links are page-specific and reopen the same tool with the same setup.
- Shared links use the page URL with an encoded `state` query parameter.
- This batch is designed to sit on top of batches 01 to 09.
