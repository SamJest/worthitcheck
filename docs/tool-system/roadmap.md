# WorthItCheck Roadmap

This roadmap keeps the expansion process focused on adjacent, high-intent tools that fit the current brand and can be shipped with heuristic logic.

## Next Up

| Priority | Tool | Why it is next | Reuse advantage |
| --- | --- | --- | --- |
| 1 | Sell or Keep Your Car | Extends the car cluster with another ownership-life-cycle decision. | Reuses mileage, ownership, and timing language from the car-buying tools. |
| 2 | Refurbished or New Laptop | Strong adjacency to upgrade and purchase-timing decisions. | Reuses feature, risk, and value framing from existing electronics tools. |
| 3 | Cash or Finance a Car | Strong car-intent query with monetization potential. | Reuses ownership and payment framing from the existing car cluster. |

## Candidate Tools

| Tool | Search / audience intent | Monetization fit | Adjacency to current tools | Complexity | Heuristic fit | Weighted impact (10) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lease or Buy Car | Very high | High | High | Medium | High | 9.2 | Live now. Use it as the reference model for future car-cluster tools. |
| New or Used Car | Very high | High | High | Medium | High | 8.9 | Live now. Pairs naturally with `Lease or Buy Car` in the car cluster. |
| Trade In or Keep Your Phone | High | Medium | High | Low | High | 8.3 | Live now. Pairs naturally with `Should I Upgrade?` in the phone cluster. |
| Sell or Keep Your Car | High | Medium | Medium | Medium | High | 7.7 | Strong ownership-life-cycle fit. |
| Refurbished or New Laptop | Medium | Medium | High | Low | High | 7.5 | Strong adjacency to upgrade and buy timing. |
| Repair or Replace HVAC | High | Medium | Medium | Medium | Medium | 7.1 | Could become a verticalized version of the main tool. |
| Cash or Finance a Car | High | High | Medium | Medium | Medium | 6.8 | Strong demand but more finance nuance. |
| Move or Stay | Medium | Medium | Low | High | Medium | 5.9 | Broader decision category, but less reusable right now. |

## Improvement Backlog

Use labels to keep the backlog scannable.

| Priority | Label | Tool | Issue | Suggested action |
| --- | --- | --- | --- | --- |
| 1 | analytics / measurement | All subtools | Homepage had analytics, but subtools were inconsistent. | Keep shared analytics initialization across all tool pages. |
| 2 | internal linking | Buy or Wait / Upgrade / Rent vs Buy | Users do not get a strong next step after finishing a tool. | Add a compact related-tools section on every tool page. |
| 3 | consistency | All subtools | Mixed `Analyze` / `Analyse` copy creates a rough edge. | Standardize button copy and shared helper defaults. |
| 4 | content quality | Rent vs Buy | Pound symbol encoding issue weakens polish and trust. | Keep UTF-8 text consistent and re-check currency copy. |
| 5 | scoring edge case | Buy or Wait | Some borderline sale-window cases can feel abrupt. | Review close-call explanations during the next logic pass. |
| 6 | monetization | Upgrade / Rent vs Buy | Ad placeholders exist but are not part of a broader checklist. | Evaluate ad placements during each improvement pass. |

## Cycle Retrospective Notes

### 2026-03-27
- Added a shared analytics initializer for all pages.
- Added a shared JS helper for future tool pages so new tools do not need copy-pasted loading/thinking/toggle code.
- Added related-tools sections to improve internal linking and next-click clarity.
- Fixed the rent-vs-buy pound-symbol encoding issue.
- Shipped `Lease or Buy Car` as the first tool built from the new roadmap and scaffold.
- Tightened the car cluster by cross-linking `Buy or Wait`, `Rent vs Buy`, and `Lease or Buy Car`.
- Shipped `New or Used Car` as the second car-cluster tool and linked it into the homepage, tools index, and car-adjacent tool pages.
- Shipped `Trade In or Keep Your Phone` as the next phone-cluster tool and linked it into the homepage, tools index, and upgrade/timing pages.
