# pgdozor frontend

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

- npm

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.1 create --template minimal --types ts --add tailwindcss="plugins:none" --install npm pgdozor-frontend
```

## Backend API setup (protobuf / Connect)

```sh
npm config set -g //buf.build/gen/npm/v1/:_authToken=BUF_TOKEN
npm config set -g @buf:registry=https://buf.build/gen/npm/v1
```

To pull the latest schema from the backend, run `npm run proto:update`.

## Developing

Once you've created a project and installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
