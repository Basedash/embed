---
"@basedash/embed": minor
---

Add the view-only `VIEWER` role to `BasedashRole`, and document how Basedash applies the `role` and `groups` claims. `createDashboardFilterToken` now throws before signing when a filter value contains `'`, `"`, `` ` ``, `\`, `;`, `--`, or `/*`, because Basedash renders signed values into chart SQL as raw text. The README now states that hiding features, the sidebar, or choosing a component is presentation only, not access control.
