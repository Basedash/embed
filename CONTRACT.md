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
| `hideSuggestedPrompts` | `hide_suggested_prompts` | boolean |

Sources in the app repository:

- `app/utils/queryParams.ts`
- `app/utils/embedSession.ts`
- `app/utils/embedFeatureVisibility.ts`

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
