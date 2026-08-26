# Next.js example

This example mints a short-lived Basedash token in a route handler and embeds
chat from a client component.

1. Copy `.env.example` to `.env.local` and add your organization ID and embed
   secret.
2. Replace the example user in `app/api/basedash-token/route.ts` with the user
   from your authenticated server session.
3. Run `pnpm install && pnpm dev`.

Never read `BASEDASH_EMBED_JWT_SECRET` from a client component or expose it
through a public environment variable.
