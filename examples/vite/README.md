# Vite example

This example embeds the Basedash dashboards workspace in a Vite React app. It
expects a trusted backend at `http://localhost:3000` to expose
`GET /api/basedash-token` and return a short-lived token as plain text.

The backend route should use `createEmbedToken` from
`@basedash/embed/server`. Never generate the token in Vite or expose the embed
secret to the browser.

Run the backend, then run `pnpm install && pnpm dev` in this directory.
