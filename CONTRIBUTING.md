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
breaking changes.

After a changeset reaches `main`, the release workflow creates or updates a
version pull request. Merging that pull request publishes the new version to
npm through trusted publishing and creates the corresponding GitHub release.

## Security

Do not open a public issue for a vulnerability or include customer embed
secrets in a reproduction. Email `security@basedash.com` instead.
