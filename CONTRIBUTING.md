# Contributing

## Setup

```bash
pnpm install
pnpm check
```

Keep changes small and preserve the iframe contract documented in
`CONTRACT.md`.

## Releasing a change

Add a changeset with:

```bash
pnpm changeset
```

Choose patch for backward-compatible fixes, minor for new APIs, and major for
breaking changes. Publishing is managed by the Basedash maintainers.

## Security

Do not open a public issue for a vulnerability or include customer embed
secrets in a reproduction. Email `security@basedash.com` instead.
