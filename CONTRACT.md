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

### `role`

| Role | Access |
| --- | --- |
| `ADMIN` | Can access everything and manage organization settings, members, data sources, and billing |
| `MEMBER` | Can create and edit, subject to resource access |
| `VIEWER` | View-only: can open resources shared with them; cannot create, edit, or chat |

- Applied on every login when supplied.
- When omitted, an active membership keeps its role; a new or reactivated
  membership gets `MEMBER`.

### `groups`

Names of existing Basedash groups. When supplied, applied on every login:

- Names match existing groups case-insensitively, ignoring leading and trailing
  spaces. The user is added to every matched group.
- The user is removed from groups the claim added on an earlier login and no
  longer names. `[]` removes every membership the claim added. An omitted claim
  leaves memberships unchanged.
- Memberships set in Basedash, through the API, or by SCIM are never removed.
- Groups are never created. A name that matches no group, matches more than one
  group, or names a SCIM-managed group is skipped, as is the whole claim when it
  lists more than 100 distinct names. The login still succeeds.
- Group membership grants access: groups scope data-source, dashboard, and chat
  access, and row-level security policies receive group names, so adding a group
  can widen the data a user sees. Only send names the integrator's server
  controls.

### Existing Basedash accounts

When `email` belongs to a verified Basedash account that is already an active
member of the organization, including an admin, the embed signs in as that
account and does not apply `role` or `groups`. Any other email gets a separate
embed user that the claims manage.

Sources in the app repository:

- `app/routes/api.sso.jwt.ts` (claims schema and public documentation)
- `app/features/embedding/planLoginTokenGroupSync.ts`
- `app/features/embedding/syncLoginTokenGroups.server.ts`
- `app/features/members/roleOptions.ts`
- `app/authz/memberRoleCapabilities.ts`

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

Basedash remembers these options for the lifetime of the iframe session, so the
SDK always emits every option explicitly.

These options, and the choice of component, are presentation only. Basedash
stores them in the iframe's session and only its UI reads them; no server route
enforces them. A user can still open any page and run any action their role,
groups, and resource access allow.

Sources in the app repository:

- `app/utils/queryParams.ts`
- `app/utils/embedSession.ts`
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

### How signed filter values are used

- Basedash converts each value to text: strings unchanged, arrays joined with
  `,`, numbers and booleans with `String()`.
- The text is rendered into chart SQL as a raw template variable, without
  quoting or escaping, and overrides every other value for that variable.
- Values a viewer supplies are checked against the variable's declared type
  (`isAllowedPublicVariableValue`). Signed values are not checked.

The SDK applies the one part of that check that does not depend on the
variable's type, which it cannot see: `createDashboardFilterToken` throws before
signing when a value's text contains any of `'`, `"`, `` ` ``, `\`, `;`, `--`,
or `/*`. Basedash applies the same rule to viewer values for free-text
variables (`STRING`, `SQL`, `RECORD`, undeclared variables, and free-text system
variables). `DATE`, `NUMBER`, and `BOOLEAN` values that Basedash accepts from a
viewer never contain these sequences. The SDK is stricter in one case: a `LIST`
option that itself contains one of them is accepted from a viewer but rejected
by the SDK.

This check narrows what a signed value can contain. It is not escaping or
parameter binding, so integrators must still build signed values only from data
their server controls.

Sources in the app repository:

- `app/utils/publicDashboardJwt.server.ts`
- `enforcePublicDashboardVariables` in
  `app/features/databases/server/publicDashboardChartQueryRequest.server.ts`
- `app/features/databases/server/publicDashboardVariableValues.server.ts`

## Compatibility checklist

Before releasing an app change that modifies any item above:

1. Open an SDK pull request updating this contract, types, builders, and tests.
   This includes the free-text sequences above, which `src/server/index.ts`
   must keep in step with `isAllowedPublicVariableValue`.
2. Release the backward-compatible SDK version before or with the app change.
3. Update the Basedash embedding documentation.
