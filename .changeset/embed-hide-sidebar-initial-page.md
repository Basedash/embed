---
"@basedash/embed": minor
---

Add `hideSidebar` to remove the embedded app's sidebar entirely, and open embeds on a specific page with `initialPage` or the `chatId`, `dashboardId`, `insightId`, `automationId`, and `modelId` component props. Changing the page under a `fetchToken` provider fetches a fresh token before reloading the iframe. Self-hosted instances need a Basedash release that supports these parameters; older releases ignore them.
