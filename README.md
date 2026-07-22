# Frontend

The querysheriff dashboard — a SvelteKit app (Svelte 5 runes, Tailwind 4) that talks to the backend over Connect-web.

> Production deployment (Kubernetes / Helm) lives in the [`querysheriff/docs`](https://github.com/querysheriff/docs) repo. This README is for working on the frontend itself.

## Local development

Requires Node 24 (see `.node-version`).

```sh
npm install
npm run dev   # localhost:3001
```

## Check

```sh
npm run check # svelte-check (types) + lint
```

## Backend schema (Connect / buf)

After a backend proto change is published to buf.build, pull the regenerated client:

```sh
npm run proto:update
```

One-time buf registry auth:

```sh
npm config set -g @buf:registry=https://buf.build/gen/npm/v1
npm config set -g //buf.build/gen/npm/v1/:_authToken=BUF_TOKEN
```

## Build & release

```sh
make release VERSION=0.1.0   # checks, tags v0.1.0, pushes; CI builds and publishes the image to GHCR
```

Or build locally:

```sh
npm run build   # adapter-node output in build/ (serve with `node build`)
```
