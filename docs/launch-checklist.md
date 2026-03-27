# WorthItCheck Launch Checklist

## Done locally

- Run `node scripts/validate_launch.js`
- Confirm `robots.txt`, `sitemap.xml`, and `CNAME` are present
- Confirm long-tail hubs and scenario pages are linked into the site
- Keep `404.html` in the deploy output

## Before upload

- Review the current diff with `git status --short`
- Do one final visual spot-check on the homepage, tools index, and the long-tail hubs
- Upload the full static site, including the new top-level folders:
  - `repair-or-replace/`
  - `should-i-upgrade/`
  - `trade-in-or-keep-your-phone/`

## Immediately after upload

- Open these live URLs and confirm they load:
  - `/`
  - `/tools/`
  - `/repair-or-replace/`
  - `/should-i-upgrade/`
  - `/trade-in-or-keep-your-phone/`
  - `/404.html`
- Confirm the custom domain is resolving to `worthitcheck.com`
- Confirm `https://worthitcheck.com/sitemap.xml` loads
- Confirm `https://worthitcheck.com/robots.txt` loads

## Search Console and Bing

- Verify the site in Google Search Console
- Verify the site in Bing Webmaster Tools
- Submit `https://worthitcheck.com/sitemap.xml` to both
- Request indexing for:
  - homepage
  - tools index
  - `/repair-or-replace/`
  - `/should-i-upgrade/`
  - `/trade-in-or-keep-your-phone/`

## First 7 days

- Avoid major content changes
- Check which pages get indexed first
- Watch for crawl errors, soft 404s, or broken canonical issues
- Note which clusters get impressions first
- Keep a short list of pages with impressions but weak clicks for the next optimization pass
