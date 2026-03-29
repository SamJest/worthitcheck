# Batch 09 summary

This batch adds a **copyable decision-summary layer** to all 6 live tools so visitors can save or send a result without screenshotting the whole page.

## Included
- new **Quick summary you can copy** section on all 6 live tools
- one-click **Copy summary** button on each result card
- shared snapshot renderer and clipboard helper in `tools/tooling.js`
- new result-summary card styling in `styles.css`
- copy-summary analytics event hook on all 6 tools

## Why this batch matters
The tools now generate richer answers, but those answers were still trapped on the page. This batch makes results easier to reuse in real life:
- send to a partner, friend, or teammate
- save for later before making the purchase decision
- compare one scenario against another more easily

## Files changed
- `styles.css`
- `tools/tooling.js`
- `tools/buy-or-wait/index.html`
- `tools/buy-or-wait/tool.js`
- `tools/lease-or-buy-car/index.html`
- `tools/lease-or-buy-car/tool.js`
- `tools/new-or-used-car/index.html`
- `tools/new-or-used-car/tool.js`
- `tools/rent-vs-buy/index.html`
- `tools/rent-vs-buy/tool.js`
- `tools/should-i-upgrade/index.html`
- `tools/should-i-upgrade/tool.js`
- `tools/trade-in-or-keep-your-phone/index.html`
- `tools/trade-in-or-keep-your-phone/tool.js`
- `read-me-first/batch-09-summary.md`
