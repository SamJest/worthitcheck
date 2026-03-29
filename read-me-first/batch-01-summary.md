# Batch 01

## What this batch fixes

1. Removes crawlable `Ad space` placeholder text from live indexable tool pages by switching those ad slots to dormant containers.
2. Hides ad slots by default until a future real ad embed is marked ready.
3. Standardizes money inputs/results so the core money tools keep one currency symbol consistently for the visitor where possible.
4. Adds small trust notes on the money-entry tools so users know to use one currency throughout.

## Files included

- `index.html`
- `script.js`
- `styles.css`
- `tools/tooling.js`
- `tools/should-i-upgrade/index.html`
- `tools/rent-vs-buy/index.html`
- `tools/rent-vs-buy/tool.js`
- `tools/trade-in-or-keep-your-phone/index.html`
- `tools/trade-in-or-keep-your-phone/tool.js`

## Deployment note

Paste these files into the project root, then redeploy the full site. The dormant ad slots will stay hidden until you later add `is-ready` or `data-ad-status="ready"` to a slot with a real ad embed inside it.
