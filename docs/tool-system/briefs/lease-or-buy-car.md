# Lease or Buy Car Brief

## Tool identity
- Tool name: Lease or Buy Car
- Folder slug: `lease-or-buy-car`
- Primary target query: `lease or buy car`
- Secondary target queries: `should I lease or buy a car`, `is leasing or buying better`, `lease vs buy car calculator`
- Audience / use case: People choosing between leasing and buying a vehicle without needing a full financial spreadsheet.

## Decision question
- Question the tool answers: Should I lease the car or buy it based on timeline, mileage, payment tolerance, ownership preference, and long-term cost mindset?
- What a successful answer should feel like: A quick, practical recommendation that explains whether flexibility or ownership value is doing more work.

## Inputs
- Required inputs:
  - expected ownership timeline
  - annual mileage
  - importance of lower monthly payment
  - importance of owning the car long term
  - interest in driving a newer car more often
  - tolerance for wear / mileage restrictions
- Optional inputs:
  - down payment comfort
  - likelihood of changing needs within 2-4 years
- Inputs that are intentionally out of scope:
  - exact APR and lease money factor math
  - taxes and region-specific fees
  - business-use tax treatment

## Outputs
- Verdict states: `LEASE`, `BUY`, `BORDERLINE`
- Confidence states: `High`, `Medium`, `Low`
- Result summary structure: one sentence with the strongest value driver
- Key factors section: payment flexibility, timeline, mileage fit, ownership preference
- Full reasoning structure: 3-5 short paragraphs plus one override note if applicable
- Related-tool links to include:
  - `Buy or Wait`
  - `Rent vs Buy`
  - future `New or Used Car`

## Scoring logic
- Main factors:
  - shorter timeline favors lease
  - high mileage favors buy
  - strong ownership preference favors buy
  - strong preference for lower monthly cost favors lease
  - desire for newer cars every few years favors lease
  - low tolerance for mileage / wear restrictions favors buy
- Positive weights:
  - lease score for short timeline, low mileage, payment sensitivity, new-car preference
  - buy score for long timeline, high mileage, ownership preference, flexibility needs
- Negative weights:
  - penalize lease when mileage is high or long-term ownership matters strongly
  - penalize buy when timeline is short and monthly payment comfort is low
- Override rules:
  - very high mileage plus long timeline should force `BUY`
  - very short timeline plus strong payment sensitivity can force `LEASE`
- Borderline handling:
  - use when payment and ownership signals conflict materially
- Inputs that should trigger validation errors:
  - missing timeline
  - missing mileage
  - impossible negative values

## SEO and content
- Title tag: `Lease or Buy Car | Should You Lease or Buy a Car?`
- Meta description: `Use WorthItCheck Lease or Buy Car to compare ownership timeline, mileage, monthly payment pressure, and flexibility before choosing whether to lease or buy.`
- Hero framing: practical car decision, not dealership jargon
- FAQ angle: mileage, monthly payments, short timelines, ownership value, when leasing stops making sense
- Schema to include: `WebApplication` and `FAQPage`

## Example scenarios
1. 2-year timeline, low mileage, high payment sensitivity -> `LEASE`
2. 7-year timeline, high mileage, wants ownership -> `BUY`
3. 3-year timeline, moderate mileage, likes new cars -> `LEASE`
4. 5-year timeline, low mileage, still wants equity -> `BUY`
5. 4-year timeline, moderate mileage, mixed goals -> `BORDERLINE`
6. 2-year timeline, changing family needs likely -> `LEASE`
7. 6-year timeline, no interest in mileage caps -> `BUY`
8. 3-year timeline, very low mileage, wants lower monthly spend -> `LEASE`
9. 5-year timeline, moderate mileage, dislikes returning cars -> `BUY`
10. 4-year timeline, wants newest tech but drives a lot -> `BORDERLINE`

## Failure and trust checks
- Easy ways the tool could mislead users:
  - sounding more precise than it is about cost without exact finance inputs
  - underweighting mileage restrictions
- Inputs that users may misunderstand:
  - timeline versus intended finance term
  - lower monthly payment versus lower total cost
- Copy notes to reduce overconfidence:
  - clarify that the tool is a heuristic decision aid, not a full loan/lease calculation

## Launch notes
- Navigation updates needed:
  - add to tools index
  - add to related-tools sections on car-relevant pages
- Sitemap updates needed:
  - add `/tools/lease-or-buy-car/`
- Improvement-pass items to tackle alongside launch:
  - refine `Rent vs Buy` car-oriented copy so the car cluster cross-links cleanly
