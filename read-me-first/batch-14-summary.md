# WorthItCheck Batch 14 Summary

## Focus
Lease or Buy Car advanced UK mode.

## Included in this batch
- Upgraded `tools/lease-or-buy-car/index.html`
- Upgraded `tools/lease-or-buy-car/tool.js`
- Updated `assumptions/index.html`
- This summary file

## What changed

### Lease or Buy Car
- Added a required **car price (£)** input so the tool can model the decision more seriously.
- Added optional **Advanced UK mode** inputs for:
  - lease monthly quote
  - lease upfront cost
  - lease term
  - lease mileage cap
  - excess mileage charge
  - buy deposit
  - buy APR
  - finance term
  - expected value at the end
  - annual insurance while owning
  - annual road tax while owning
  - annual servicing and repairs
- Added a new **Estimated UK-style cost view** result block showing:
  - estimated lease cost
  - estimated buy net cost
  - estimated buy payment
  - estimated end equity
  - break-even timing
- Upgraded the verdict logic so it now blends:
  - timeline and lifestyle signals
  - mileage-cap pressure
  - estimated monthly finance pressure
  - end equity / residual value
  - modeled lease-vs-buy total cost
- Updated the page copy, FAQ, and scope notes so the tool reads like a stronger UK-style decision product instead of a light heuristic.

### Assumptions page
- Updated the **Lease or Buy Car** entry so it matches the stronger tool and explains the new finance / quote assumptions more clearly.

## Validation
- `node --check tools/lease-or-buy-car/tool.js`
- `node scripts/validate_launch.js`
- validator passed on **29 HTML files**
