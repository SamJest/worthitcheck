# Batch 15 summary

This batch upgrades **New or Used Car** from a light heuristic into a stronger UK-style ownership-cost decision tool.

## Included
- `tools/new-or-used-car/index.html`
- `tools/new-or-used-car/tool.js`
- `assumptions/index.html`

## What changed
- Added **Advanced UK cost mode** inputs for:
  - new car price
  - used car price
  - used car age
  - deposit
  - APR
  - finance term
  - annual insurance for new and used
  - annual road tax for new and used
  - annual maintenance for new and used
- Added a new **3-year and 5-year ownership cost view** to the result card
- The tool now estimates:
  - depreciation
  - finance drag
  - insurance
  - tax
  - maintenance
- The main verdict now blends:
  - weighted lifestyle signals
  - warranty/risk preference
  - inspection backup
  - a stronger ownership-cost model
- Updated the page copy, FAQ answers, schema copy, and scope notes to match the stronger tool
- Updated the assumptions page entry for **New or Used Car**

## Validation
- `node --check tools/new-or-used-car/tool.js`
- launch validator passed on **29 HTML files** after excluding an old non-production `batch-01/` snapshot folder that is not part of the live site
