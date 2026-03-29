# Batch 18 summary

This batch adds **side-by-side comparison mode** to the six live tools.

## Added in this batch
- Save the current result as a baseline
- Change the inputs and rerun the tool
- See the **saved baseline vs current scenario** side by side inside the result screen
- A short **What changed** summary under the comparison cards
- Shared comparison styling in `styles.css`
- Shared comparison storage/render helpers in `tools/tooling.js`

## Tools updated
- `tools/buy-or-wait/`
- `tools/lease-or-buy-car/`
- `tools/new-or-used-car/`
- `tools/rent-vs-buy/`
- `tools/should-i-upgrade/`
- `tools/trade-in-or-keep-your-phone/`

## Notes
- Comparisons are stored **in the browser** for each tool using local storage.
- The saved comparison is tool-specific, so a saved rent-vs-buy baseline does not affect the car or phone tools.
- This batch is a **delta patch**, not the full checkpoint. Batch 20 should be the full cumulative checkpoint ZIP.
