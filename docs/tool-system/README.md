# WorthItCheck Tool System

This folder turns tool expansion into a repeatable system instead of a one-off build process.

## Working cadence
Use one micro-cycle per release:

1. choose the next tool from [roadmap.md](./roadmap.md)
2. copy the reusable page scaffold from [templates/tool-page](./templates/tool-page/)
3. fill out the spec in [tool-brief-template.md](./tool-brief-template.md)
4. implement the page and scoring logic
5. run the launch checks in [new-tool-checklist.md](./new-tool-checklist.md)
6. complete one pass from [improvement-pass-checklist.md](./improvement-pass-checklist.md)
7. update the scorecard and retrospective notes

## Source of truth
- `roadmap.md`: candidate tools, next-up queue, and improvement backlog
- `tool-brief-template.md`: decision-complete spec before implementation
- `new-tool-checklist.md`: launch and QA checklist for any new tool
- `improvement-pass-checklist.md`: fixed improvement budget for existing tools
- `scorecard-template.md`: consistent review scorecard after launch
- `templates/tool-page/`: starter scaffold for future tool pages
- `long-tail-clusters.md`: repeatable process for hub pages and scenario pages around existing tools

## Delivery rules
- Ship one new tool at a time.
- Do not start the next tool until the launch checklist and backlog updates are complete.
- Keep future tools inside the current static HTML/CSS/vanilla JS stack.
- Prefer tools that can be answered with strong heuristics and no live external data.
- When one issue appears in a live tool, check whether the same pattern exists across the rest of the site.
