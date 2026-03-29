# Batch 13 summary

This batch upgrades **Rent vs Buy** into a more serious **UK-style** decision tool.

## Included
- `tools/rent-vs-buy/index.html`
- `tools/rent-vs-buy/tool.js`
- `styles.css`
- `assumptions/index.html`

## What changed
- Added **Advanced UK mode** with optional inputs for:
  - deposit
  - mortgage rate
  - mortgage term
  - buy fees
  - sell fees
  - annual upkeep
  - annual rent increase
  - annual home value change
  - cash savings return
- Reworked the result modelling to estimate:
  - mortgage payment
  - upfront cash needed
  - net buy cost
  - ending equity after sale costs
  - break-even timing
  - monthly buy-side cash pressure
- Improved the **Rent vs Buy** page copy, scope notes, and FAQ framing so the page now matches the stronger tool logic.
- Updated the **Assumptions** page so Rent vs Buy no longer describes the old lightweight version.

## Checks passed
- `node --check tools/rent-vs-buy/tool.js`
- `node scripts/validate_launch.js` → passed on **29 HTML files**
