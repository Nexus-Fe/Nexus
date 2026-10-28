# Nexus Frontend

Frontend for the Nexus marketplace, built with Next.js App Router, React and TypeScript.

## Run locally

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). `.env.local` targets the Gateway host port documented by the backend stack (`http://localhost:8080`). Change only `API_GATEWAY_URL` when the real Gateway runs at another address. Business API traffic passes through a same-origin Route Handler that refuses responses unless the Gateway confirms `Real` mode and enforced authentication.

The backend must be running with Gateway authentication set to `Enforce` and every service (`users`, `catalog`, `commerce`, `auction`, `fulfillment`, `wallet`, and the remaining configured services) set to `Real`. The proxy returns an explicit 503 when the Gateway reports another mode. This frontend contains no fixtures or mock-mode switch.

## Project shape

```text
src/
├── app/          # Route groups and thin pages
├── components/   # Shared UI and layout
├── features/     # auth, profile, catalog, commerce, wallet, auction,
│                 # fulfillment, notification and audit-log
├── widgets/      # UI composed from multiple features
├── lib/api/      # Browser API client and same-origin live Gateway proxy
└── constants/    # Navigation and route paths
```

The screens render client-side. User roles improve navigation, while the API Gateway remains responsible for enforcing authorization. The frontend refuses mock or authentication-bypass Gateway responses and does not supply fixture data.

The production build uses Next.js Webpack because the default Turbopack build panicked while starting the Tailwind CSS worker in this Windows environment. Development still uses the configured Turbopack.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```
