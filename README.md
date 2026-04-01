This is a realtime Werewolf game built with Next.js, Socket.IO, NextAuth, and Prisma.

## Getting Started

Install dependencies and start the local dev server:

```bash
npm install
npm run dev
```

## Tests

```bash
npm run lint
npm run build
npm test
npm run e2e
```

## Environment

Create `.env.local` for local development. The app supports two modes:

- With `DATABASE_URL`, users persist in Postgres through Prisma.
- Without `DATABASE_URL`, credentials auth falls back to an in-memory user store for dev/test.

Required secrets for production:

```bash
AUTH_SECRET="replace-me"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/werewolf?schema=public"
AUTH_URL="https://your-app-name.onrender.com"
```

Optional OAuth providers:

```bash
GITHUB_CLIENT_ID="replace-me"
GITHUB_CLIENT_SECRET="replace-me"
GOOGLE_CLIENT_ID="replace-me"
GOOGLE_CLIENT_SECRET="replace-me"
```

Optional runtime overrides:

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

## Database (Postgres)

User accounts persist in Postgres when `DATABASE_URL` is set (Prisma + NextAuth Prisma adapter). If `DATABASE_URL` is not set, the app falls back to an in-memory user store for dev/test.

1. Set `DATABASE_URL` (example):

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/werewolf?schema=public"
```

2. Create/apply migrations:

```bash
npm run db:migrate
```

3. Start the app:

```bash
npm run dev
```

## E2E

```bash
npm run e2e:install
npm run e2e
```

## Deployment

This app uses a custom Node server in [server.js](/c:/Users/mamar/Documents/GitHub/werewolf/server.js), so deploy it to a host that supports long-running Node processes and WebSockets.

Typical production steps:

```bash
npm install
npm run build
npm run db:deploy
npm run start
```

The server reads `PORT` from the environment and binds to `HOST` when provided, otherwise `0.0.0.0`. Avoid setting `HOSTNAME` on Render because that variable is reserved for the container's internal hostname.

In production, startup now fails fast if `AUTH_SECRET` or `DATABASE_URL` is missing, or if only half of an OAuth provider configuration is present. For hosted environments such as Render, set `AUTH_URL` to your public site URL.

Recommended targets include Railway, Render, Fly.io, Docker, or any VM/container platform with WebSocket support. A standard Vercel deployment is not the right fit for this custom Socket.IO server.

## CI

- Runs `npm run lint`, `npm run build`, `npm test`, and `npm run e2e` on PRs via GitHub Actions.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app locally.
