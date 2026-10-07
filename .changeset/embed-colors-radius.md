---
"@basedash/embed": minor
---

Add `colors` and `radius` to match an embed to your app. `colors` takes a required `background` plus optional `sidebarBackground`, `foreground`, `accent`, and up to nine `chart` colors; Basedash derives every other shade from them, and light or dark mode follows the background. `radius` is `"none"`, `"small"`, `"default"`, or `"large"`. Both work on the provider, every authenticated component, `BasedashSharedDashboard`, and the URL builders. `buildEmbedUrl` now always emits `radius` and `color_background` (`default` when no colors are set). Self-hosted instances need a Basedash release that supports these parameters; older releases ignore them.
