# Nexus Frontend

Frontend for the Nexus marketplace, built with Next.js App Router, React and TypeScript.

## Run locally

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). `.env.local` targets the Gateway host port documented by the backend stack (`http://localhost:8080`). Change `API_GATEWAY_URL` when the real Gateway runs at another address. Business API traffic passes through a same-origin Route Handler that requires the Gateway to confirm `Real` mode and `Enforce` authentication.

For a live integration check, the backend must run with Gateway authentication set to `Enforce` and each required service set to `Real`. The proxy requests those modes and returns 503 if the Gateway reports anything else.

For a **local FE-only Staff/Admin demo**, set `NEXT_PUBLIC_STAFF_ADMIN_DEMO=1` in `.env.local` and start `npm run dev`. Only `/staff/sellers`, `/staff/sellers/[id]`, `/admin/categories`, and `/admin/users` use sample records stored in the browser session. These screens display a Demo notice and do not send business API requests. The demo flag has no effect in production builds. Remove the flag and restart the dev server to return to Gateway-backed behavior. This mode does not validate backend persistence, authorization, OTP, warehouse synchronization, or token revocation.

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

The screens render client-side. User roles improve navigation, while the API Gateway remains responsible for enforcing authorization in live mode. The optional Staff/Admin local demo is explicitly separate from live Gateway verification.

The production build uses Next.js Webpack because the default Turbopack build panicked while starting the Tailwind CSS worker in this Windows environment. Development still uses the configured Turbopack.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

## GitHub CI and VPS deployment

`Frontend CI` runs `npm ci`, lint, typecheck, and a production build for pushes and pull requests. After a successful push to `dev`, it publishes an immutable image tagged `ghcr.io/<owner>/<repo>:sha-<commit-sha>` to GitHub Container Registry. The image contains the Next.js standalone server and needs a Node-capable host; GitHub Pages cannot run this app's server-side Gateway proxy.

VPS deployment is manual through the **Deploy frontend to VPS** GitHub Actions workflow. Its `image_sha` input is the full SHA of a published `dev` commit. GitHub shows the manual workflow after this workflow file is present on the repository's default branch.

Before the first deploy, create a GitHub `production` environment with these secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `GHCR_READ_USER`, and `GHCR_READ_TOKEN` (a token with package read access for a private image). Set environment variables `API_GATEWAY_URL` and optionally `VPS_PORT` (default `22`). The VPS user needs Docker Compose access. The workflow copies `deploy/compose.yaml` to `~/nexus-fe` and binds the container to `127.0.0.1:3000`; configure a TLS reverse proxy on the VPS separately. `API_GATEWAY_URL` must be reachable **from the container**, not just from a browser or the VPS host.
