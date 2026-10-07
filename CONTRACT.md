# Basedash embed contract

The SDK is intentionally a thin layer over the Basedash application. Update
this file and the corresponding implementation whenever the app's embed
contract changes.

## Full-app authentication

- Endpoint: `GET /api/sso/jwt`
- Required query parameter: `jwt`
- Algorithm: HS256
- Required claims: `email`, `orgId`, `iat`, `exp`
- Optional claims: `firstName`, `lastName`, `role`, `groups`
- Roles: `ADMIN`, `MEMBER`

Source in the app repository:
`app/routes/api.sso.jwt.ts`.

## Embed options

| SDK option | Query parameter | Values |
| --- | --- | --- |
| `theme` | `theme` | `light`, `dark`, `auto` |
| `hideOrgName` | `hide_org_name` | boolean |
| `hideChat` | `hide_chat` | boolean |
| `hideDashboards` | `hide_dashboards` | boolean |
| `hideInsights` | `hide_insights` | boolean |
| `hideAutomations` | `hide_automations` | boolean |
| `hideModels` | `hide_models` | boolean |
| `hideSuggestedPrompts` | `hide_suggested_prompts` | boolean |
| `hideSidebar` | `hide_sidebar` | boolean |
| `radius` | `radius` | `none`, `small`, `default`, `large` |
| `colors.background` | `color_background` | 6-digit hex without `#`, or `default` |
| `colors.sidebarBackground` | `color_sidebar_background` | 6-digit hex without `#` |
| `colors.foreground` | `color_foreground` | 6-digit hex without `#` |
| `colors.accent` | `color_accent` | 6-digit hex without `#` |
| `colors.chart` | `color_chart` | 1–9 comma-separated 6-digit hex values |

Basedash remembers these options for the lifetime of the iframe session, so the
SDK always emits every option explicitly. Colors are the exception:

- `color_background` is always emitted (`default` when `colors` is `null`) and
  defines the whole color set. Basedash replaces the stored colors with the
  URL's set, so the other color params are only emitted when set.
- If any color param is invalid, Basedash ignores the whole set and keeps the
  session's colors. The SDK normalizes hex and throws on invalid colors, so it
  never emits an invalid set.
- Light or dark mode follows `color_background`, overriding `theme`.
- `color_chart` fills the chart color slots in order: neutral, blue, orange,
  purple, red, teal, green, yellow, pink. Basedash AI picks slots by these
  names.

The app also accepts 3-digit hex and a leading `#`; the SDK emits neither.

Shared dashboards accept `radius` and the color params too. `buildSharedDashboardUrl`
only emits them when `colors` or `radius` is set; `BasedashSharedDashboard`
always does.

Sources in the app repository:

- `app/utils/queryParams.ts`
- `app/utils/embedSession.ts`
- `app/utils/embedAppearance.ts`
- `app/utils/embedFeatureVisibility.ts`

## Initial page

| `initialPage.type` | Query parameter | Opens |
| --- | --- | --- |
| `chat` | `chat_id` | `/orgs/{slug}/chats/{id}` |
| `dashboard` | `dashboard_id` | `/orgs/{slug}/dashboards/{id}` |
| `insight` | `insight_id` | `/orgs/{slug}/insights/{id}` |
| `automation` | `automation_id` | `/orgs/{slug}/automations/{id}` |
| `model` | `model_id` | `/orgs/{slug}/models/{id}` |

- One-shot: applied when the iframe lands on the organization and not stored in
  the embed session.
- Ignored, falling back to the default landing page, when the page's feature is
  hidden or disabled, or when the ID contains characters other than letters,
  digits, `_`, and `-`.
- If several are set, the first visible one in the table's order wins. The SDK
  emits at most one.
- Existence and access are not checked up front; a missing or inaccessible
  entity renders Basedash's not-found page.

Sources in the app repository:

- `getEmbedLanding` in `app/utils/embedFeatureVisibility.ts`
- `app/routes/_app.orgs.$orgSlug._detail._index/route.tsx`

## Shared dashboards

- Public URL: `/shared/{publicSharingLinkId}`
- Secure-filter URL: `/shared/{publicSharingLinkId}/{jwt}`
- Required secure-filter claims: `dashboardLinkId`, `params`, `exp`
- Optional secure-filter claim: `iat`
- Filter values: string, string array, finite number, or boolean

Source in the app repository:
`app/utils/publicDashboardJwt.server.ts`.

## Compatibility checklist

Before releasing an app change that modifies any item above:

1. Open an SDK pull request updating this contract, types, builders, and tests.
2. Release the backward-compatible SDK version before or with the app change.
3. Update the Basedash embedding documentation.
