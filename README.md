# Nexus Frontend

Frontend for the Nexus marketplace, built with Next.js App Router, React, TypeScript and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the API Gateway address when backend integration is available.

## Project shape

```text
src/
├── app/          # Route groups and thin pages
├── components/   # Shared UI and layout
├── features/     # auth, profile, catalog, commerce, wallet, auction,
│                 # fulfillment, notification and audit-log
├── widgets/      # UI composed from multiple features
├── lib/api/      # Shared browser API client
└── constants/    # Gateway config and route paths
```

The current pages are route scaffolds. Feature types and REST paths are starting assumptions from the approved plans and must be checked against the backend OpenAPI contract before real workflows are enabled. Dashboard route groups currently organize pages; they do not enforce login or role access.

The production build uses Next.js Webpack because the default Turbopack build panicked while starting the Tailwind CSS worker in this Windows environment. Development still uses the configured Turbopack.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```
