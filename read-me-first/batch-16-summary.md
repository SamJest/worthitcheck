# Batch 16 Summary

This batch upgrades **Trade In or Keep Your Phone** into a more market-aware tool.

## Included
- `tools/trade-in-or-keep-your-phone/index.html`
- `tools/trade-in-or-keep-your-phone/tool.js`
- `assumptions/index.html`
- `read-me-first/batch-16-summary.md`

## What changed
- expanded the phone tool from a simple **trade in vs keep** call into a stronger **keep vs trade in vs sell privately vs recycler** decision
- switched the tool to **UK-style GBP output**
- added optional advanced inputs for:
  - private-sale value
  - recycler / instant-cash value
  - likely repair or battery-fix cost
  - replacement phone cost
  - willingness to sell it yourself
- upgraded the logic to estimate:
  - best current route now
  - likely value drop if you wait
  - route practicality based on condition and selling effort
  - replacement gap after cashing out now
- updated result output so the tool can now return:
  - `KEEP`
  - `TRADE IN`
  - `SELL PRIVATELY`
  - `RECYCLE NOW`
  - `BORDERLINE`
- updated the assumptions page entry so it matches the stronger tool

## Notes
- this batch keeps the existing result UX layers from earlier batches intact
- shared-result links now preserve the advanced phone-tool inputs too
