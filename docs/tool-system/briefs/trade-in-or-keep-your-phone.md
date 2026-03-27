# Trade In or Keep Your Phone Brief

## Tool identity
- Tool name: Trade In or Keep Your Phone
- Folder slug: `trade-in-or-keep-your-phone`
- Primary target query: `trade in or keep phone`
- Secondary target queries: `should I trade in my phone`, `keep my phone or trade it in`
- Audience / use case: People deciding whether to trade in a phone now or keep using it longer.

## Decision question
- Question the tool answers: Should I trade in my phone now or keep it based on age, battery health, performance, trade-in value, and upgrade desire?
- What a successful answer should feel like: A practical answer that explains whether preserving value now or extracting more life from the phone is the stronger move.

## Inputs
- Required inputs:
  - phone age
  - performance
  - battery / reliability
  - trade-in value
  - feature importance
  - expected extra hold time

## Outputs
- Verdict states: `TRADE IN`, `KEEP`, `BORDERLINE`
- Confidence states: `High`, `Medium`, `Low`
- Related-tool links to include:
  - `Should I Upgrade?`
  - `Buy or Wait`
  - `Repair or Replace`

## Scoring logic
- Trade-in signals: older phone, weaker battery, slower performance, stronger trade-in value, higher feature pull
- Keep signals: younger phone, stable battery, good performance, weak trade-in value, low upgrade pull
- Override rules:
  - old phone plus poor battery and decent value should force `TRADE IN`
  - recent phone plus strong performance and low feature need should force `KEEP`

## SEO and content
- Title tag: `Trade In or Keep Your Phone | Should You Trade It In Now?`
- Meta description: `Use WorthItCheck Trade In or Keep Your Phone to compare age, battery health, performance, trade-in value, and upgrade pull before deciding whether to trade in or keep your phone.`
- Schema to include: `WebApplication` and `FAQPage`

## Example scenarios
1. 4-year-old phone, battery issues, solid trade-in offer -> `TRADE IN`
2. 2-year-old phone, fast, low feature need -> `KEEP`
3. 3.5-year-old phone slowing, medium trade-in offer -> `TRADE IN`
4. Recent phone, low trade-in value, works great -> `KEEP`
5. Mid-life phone, mixed battery/performance, moderate offer -> `BORDERLINE`

## Launch notes
- Navigation updates needed:
  - add to tools index
  - add to homepage tools section
  - cross-link with `Should I Upgrade?`
- Sitemap updates needed:
  - add `/tools/trade-in-or-keep-your-phone/`
