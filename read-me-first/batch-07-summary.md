# Batch 07 summary

This batch adds a new **decision-boundary layer** to all 6 live tool pages.

## What changed
- Added a new **"What could change the answer"** section to:
  - `tools/buy-or-wait/`
  - `tools/lease-or-buy-car/`
  - `tools/new-or-used-car/`
  - `tools/rent-vs-buy/`
  - `tools/should-i-upgrade/`
  - `tools/trade-in-or-keep-your-phone/`
- Added a shared renderer in `tools/tooling.js`
- Added matching card styles in `styles.css`
- Added tool-specific logic so each page now shows:
  - what keeps the current verdict strong
  - what could flip the verdict the other way
  - more useful guidance for borderline calls

## Why this batch matters
This makes the tools feel less black-box and more like a real decision product. Instead of only giving a verdict and next step, each tool now explains the **decision boundary** around that verdict.

## Files in this batch
- `styles.css`
- `tools/tooling.js`
- all 6 live tool `index.html` files
- all 6 live tool `tool.js` files
