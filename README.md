# Basedash embed SDK

Typed server helpers and React components for embedding
[Basedash](https://www.basedash.com) in your product.

The SDK wraps Basedash's production iframe and JWT SSO flow. Your server signs
a short-lived token, your frontend fetches it, and the React component renders
the correct iframe URL and feature configuration.

## Install

```bash
npm install @basedash/embed
```

React 18.2 and React 19 are supported.

## Quick start

### 1. Create a token on your server

```ts
import { createEmbedToken } from "@basedash/embed/server";

export async function GET() {
  // Get this identity from your authenticated server session.
  const user = {
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
  };

  const token = await createEmbedToken({
    secret: process.env.BASEDASH_EMBED_JWT_SECRET!,
    orgId: process.env.BASEDASH_ORG_ID!,
    user: {
      ...user,
      role: "MEMBER",
    },
  });

  return new Response(token, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
    },
  });
}
```

`createEmbedToken` is exported from the server-only entry point. Never import it
into browser code or expose your embed secret through a public environment
variable.

### 2. Render a Basedash component

```tsx
"use client";

import { BasedashChat, BasedashProvider } from "@basedash/embed/react";
import { useCallback } from "react";

export function Analytics() {
  const fetchToken = useCallback(async () => {
    const response = await fetch("/api/basedash-token");
    if (!response.ok) {
      throw new Error("Could not create a Basedash token");
    }
    return response.text();
  }, []);

  return (
    <BasedashProvider fetchToken={fetchToken} theme="auto">
      <BasedashChat
        loadingFallback={<p>Loading analytics…</p>}
        style={{ height: 720 }}
      />
    </BasedashProvider>
  );
}
```

The provider fetches once per mount. Multiple components under the same
provider reuse the token.

## React components

Import React APIs from `@basedash/embed/react`.

### `BasedashChat`

Embeds chat and hides dashboards, insights, automations, and the organization
name by default.

```tsx
<BasedashChat hideSuggestedPrompts />
```

### `BasedashDashboards`

Embeds the interactive dashboards workspace and hides all other primary
features.

```tsx
<BasedashDashboards />
```

Pass `dashboardId` to open a specific dashboard instead of the dashboards home
page. Combine it with `hideSidebar` when your app provides its own navigation:

```tsx
<BasedashDashboards dashboardId="clx2a1b3c0000" hideSidebar />
```

### `BasedashInsights`

Embeds insights and hides all other primary features.

```tsx
<BasedashInsights />
```

The organization must have insights enabled.

### `BasedashAutomations`

Embeds automations and hides all other primary features.

```tsx
<BasedashAutomations />
```

The organization must have automations enabled.

### `BasedashModels`

Embeds models and hides all other primary features.

```tsx
<BasedashModels />
```

The organization must have models enabled.

### `BasedashApp`

Embeds the complete Basedash app. Feature props map to the existing Basedash
embed configuration.

```tsx
<BasedashApp
  hideOrgName
  hideInsights
  hideAutomations
  hideModels
  hideSuggestedPrompts
/>
```

At least one of chat, dashboards, insights, automations, or models must remain visible.
Basedash falls back to chat if all five are hidden.

Use `initialPage` to choose the page the app opens on:

```tsx
<BasedashApp initialPage={{ type: "dashboard", id: "clx2a1b3c0000" }} />
```

### `BasedashSharedDashboard`

Embeds a read-only dashboard from a public sharing link. It does not require a
provider or a user token.

```tsx
<BasedashSharedDashboard publicSharingLinkId="abc123" />
```

To lock dashboard filters, create a server-side filter token and pass it to the
component:

```ts
import { createDashboardFilterToken } from "@basedash/embed/server";

const filterToken = await createDashboardFilterToken({
  secret: process.env.BASEDASH_EMBED_JWT_SECRET!,
  dashboardLinkId: "abc123",
  params: {
    company_id: "company_456",
    regions: ["us", "ca"],
  },
});
```

```tsx
<BasedashSharedDashboard
  publicSharingLinkId="abc123"
  filterToken={filterToken}
/>
```

## Opening a specific page

Each feature component accepts an ID prop that opens that page instead of the
feature's home page:

| Component | Prop | `initialPage.type` |
| --- | --- | --- |
| `BasedashChat` | `chatId` | `chat` |
| `BasedashDashboards` | `dashboardId` | `dashboard` |
| `BasedashInsights` | `insightId` | `insight` |
| `BasedashAutomations` | `automationId` | `automation` |
| `BasedashModels` | `modelId` | `model` |

This only chooses where the embed starts; users can still navigate elsewhere
unless you also hide the sidebar and other features. Basedash opens the default
page instead when the target's feature is hidden or disabled for the
organization. A missing ID, or one the user can't access, shows Basedash's
not-found page.

Changing the ID reloads the iframe on the new page. Under a `fetchToken`
provider, the component fetches a fresh token first, since the original one may
have expired, and keeps showing the current page until it arrives. When you pass
`token` yourself, make sure it is still valid when the ID changes.

## Hiding the sidebar

`hideSidebar` removes the left sidebar entirely, including its toggle button,
keyboard shortcut, and command menu entry, so users cannot reopen it. Your app
then owns navigation, so pair it with a single feature component and, usually,
an ID prop:

```tsx
<BasedashDashboards dashboardId={dashboardId} hideSidebar />
```

Every authenticated component accepts `hideSidebar`. It defaults to `false`.

## Authentication options

Use `fetchToken` when the browser should request the current user's token from
your backend:

```tsx
<BasedashProvider fetchToken={fetchToken}>
  <BasedashApp />
</BasedashProvider>
```

If your React tree already receives a server-generated token, pass it directly:

```tsx
<BasedashProvider token={token}>
  <BasedashDashboards />
</BasedashProvider>
```

You can also pass `token` directly to an authenticated component without a
provider:

```tsx
<BasedashChat token={token} />
```

`useBasedash()` exposes the current `token`, `status`, `error`, and a
`refreshToken()` method.

## Frame props

All components accept:

- `className` and `style` for the outer container
- `iframeProps` for the underlying iframe
- `loadingFallback`, shown until the iframe loads
- `errorFallback`, shown when provider token fetching fails
- `title` for the iframe's accessible name
- `instanceUrl` for self-hosted Basedash

The iframe defaults to full width and height, no border,
`allow="clipboard-write"`, and eager loading.

```tsx
<BasedashDashboards
  className="analytics"
  style={{ minHeight: 640 }}
  iframeProps={{
    allow: "clipboard-write; fullscreen",
    onLoad: () => console.log("Basedash loaded"),
  }}
/>
```

## Non-React usage

The root entry point has zero framework dependencies and can build iframe URLs
for any frontend:

```ts
import { buildEmbedUrl } from "@basedash/embed";

const src = buildEmbedUrl({
  token,
  options: {
    theme: "dark",
    hideOrgName: true,
    hideChat: true,
    hideSidebar: true,
  },
  initialPage: { type: "dashboard", id: "clx2a1b3c0000" },
});
```

For public dashboards:

```ts
import { buildSharedDashboardUrl } from "@basedash/embed";

const src = buildSharedDashboardUrl({
  publicSharingLinkId: "abc123",
  filterToken,
});
```

These helpers emit every embed option explicitly so changing or remounting an
embed cannot inherit stale session configuration. `initialPage` is the
exception: it is applied once when the iframe loads and is not remembered.

## Self-hosted Basedash

Set `instanceUrl` on the provider or component:

```tsx
<BasedashProvider
  fetchToken={fetchToken}
  instanceUrl="https://analytics.example.com"
>
  <BasedashApp />
</BasedashProvider>
```

Server token generation is identical for cloud and self-hosted instances.

## Before going to production

1. Enable full app embedding in **Settings → Embedding**.
2. Store the JWT secret from **Settings → Security** only on your backend.
3. Configure your production domains under allowed embed origins.
4. Verify every token request against your own authenticated user and
   authorization rules.
5. Connect Basedash with read-only database credentials.

Tokens default to a 10-minute lifetime. Shared dashboard filter tokens default
to one hour. A valid full-app token is only needed when the iframe establishes
its Basedash session, which happens again whenever its URL changes (for
example, a new `dashboardId`).

## Current limitations

- The SDK wraps iframes; it does not render Basedash UI natively.
- Basedash does not yet expose an iframe `postMessage` protocol, so auto-resize,
  navigation events, and host-triggered actions are not available.
- Shared dashboard embeds are supported. A standalone shared-chart embed is
  not currently available from the Basedash app.

## Development

```bash
pnpm install
pnpm check
```

The package ships ESM, CommonJS, and TypeScript declarations for:

- `@basedash/embed`
- `@basedash/embed/server`
- `@basedash/embed/react`

See `examples/nextjs` and `examples/vite` for integrations.

## License

MIT
