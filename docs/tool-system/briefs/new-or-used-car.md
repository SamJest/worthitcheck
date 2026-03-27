# New or Used Car Brief

## Tool identity
- Tool name: New or Used Car
- Folder slug: `new-or-used-car`
- Primary target query: `new or used car`
- Secondary target queries: `should I buy a new or used car`, `is it better to buy new or used`, `new vs used car calculator`
- Audience / use case: People deciding whether a new car or a used car is the smarter fit without needing a dealer-style spreadsheet.

## Decision question
- Question the tool answers: Should I buy a new car or a used car based on budget pressure, ownership timeline, warranty importance, comfort with used-car risk, and desire for the latest features?
- What a successful answer should feel like: A practical answer that explains whether value and price savings or certainty and long-term reliability are doing more work.

## Inputs
- Required inputs:
  - expected ownership timeline
  - annual mileage
  - importance of keeping the upfront price down
  - importance of warranty / reliability certainty
  - desire for the latest features and tech
  - comfort with used-car maintenance / history risk
- Optional inputs:
  - urgency to buy
  - access to a trusted mechanic / inspection
- Inputs that are intentionally out of scope:
  - exact financing rates
  - resale calculations
  - dealer incentives and taxes

## Outputs
- Verdict states: `NEW`, `USED`, `BORDERLINE`
- Confidence states: `High`, `Medium`, `Low`
- Result summary structure: one clear sentence with the strongest decision driver
- Key factors section: budget pressure, warranty value, ownership timeline, comfort with used-car risk
- Full reasoning structure: 3-5 short paragraphs plus one override note if applicable
- Related-tool links to include:
  - `Lease or Buy Car`
  - `Buy or Wait`
  - `Repair or Replace`

## Scoring logic
- Main factors:
  - stronger budget pressure favors used
  - stronger warranty / reliability need favors new
  - stronger desire for latest features favors new
  - greater comfort with used-car risk favors used
  - shorter timeline favors used
  - longer timeline and heavier mileage favor new
- Positive weights:
  - new score for warranty, latest features, long timeline, higher mileage
  - used score for price pressure, short timeline, comfort with used risk
- Negative weights:
  - penalize used when certainty matters a lot
  - penalize new when budget pressure is strong and short-term ownership is likely
- Override rules:
  - very strong budget pressure plus comfort with used risk should force `USED`
  - strong warranty need plus low risk tolerance and long timeline should force `NEW`
- Borderline handling:
  - use when budget and certainty signals conflict materially
- Inputs that should trigger validation errors:
  - missing timeline
  - missing mileage
  - impossible negative values

## SEO and content
- Title tag: `New or Used Car | Should You Buy New or Used?`
- Meta description: `Use WorthItCheck New or Used Car to compare price pressure, warranty value, ownership timeline, and risk comfort before deciding whether to buy new or used.`
- Hero framing: confidence vs value in plain English, not dealership jargon
- FAQ angle: warranty, depreciation, budget pressure, short-term ownership, used-car risk
- Schema to include: `WebApplication` and `FAQPage`

## Example scenarios
1. Tight budget, short timeline, comfortable with used risk -> `USED`
2. Long timeline, high mileage, wants certainty -> `NEW`
3. Moderate budget, high warranty importance, low repair-risk tolerance -> `NEW`
4. Wants best value, low mileage, happy to inspect a used car -> `USED`
5. Mixed priorities, 5-year timeline, moderate mileage -> `BORDERLINE`
6. High tech priority, long ownership plan -> `NEW`
7. Strong price pressure, medium warranty concern, 3-year plan -> `USED`
8. Low price pressure, low risk tolerance, 7-year plan -> `NEW`
9. Wants low upfront cost but also hates surprise repairs -> `BORDERLINE`
10. 2-year plan with trusted mechanic and low mileage -> `USED`

## Failure and trust checks
- Easy ways the tool could mislead users:
  - overstating certainty without inspection or maintenance-history context
  - underweighting the value of a trusted used-car inspection
- Inputs that users may misunderstand:
  - lower upfront price versus lower total cost
  - warranty importance versus actual expected maintenance tolerance
- Copy notes to reduce overconfidence:
  - clarify that the tool is a heuristic decision aid, not a pricing or financing calculator

## Launch notes
- Navigation updates needed:
  - add to tools index
  - add to homepage tools section
  - cross-link with `Lease or Buy Car`
- Sitemap updates needed:
  - add `/tools/new-or-used-car/`
- Improvement-pass items to tackle alongside launch:
  - strengthen the car cluster with internal links from `Lease or Buy Car` and `Buy or Wait`
