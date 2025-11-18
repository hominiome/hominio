# API Service

Elysia + Bun server for Hominio monorepo. Handles Zero sync endpoints (get-queries, push) and API endpoints.

## Architecture

- **Client** → Connects directly to Zero sync service (`sync.hominio.me`)
- **Zero sync** → Forwards cookies to this API service for authentication
- **API service** → Handles get-queries and push endpoints (uses Better Auth cookies from wallet service)

## Port

- **Development**: `4204`
- **Production**: `api.hominio.me` (port 4204 internally)

## Environment Variables

Set these in Fly.io secrets and root `.env`:

- `SECRET_ZERO_DEV_PG` - Postgres connection string (non-pooler, same as sync service)
- `AUTH_SECRET` - Better Auth secret (same as wallet service)
- `SECRET_NEON_PG_AUTH` - Auth database connection (same as wallet service)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth (optional)
- `ADMIN` - Admin user IDs (comma-separated)

## Endpoints

### Zero Sync Endpoints
- `POST /api/v0/zero/get-queries` - Zero synced queries endpoint
- `POST /api/v0/zero/push` - Zero custom mutators endpoint

### API Endpoints
- `GET /api/v0/projects` - Returns list of projects

### Better Auth
- All `/api/auth/*` routes are handled by Better Auth handler

## Deployment

```bash
cd services/api
fly deploy -c fly.toml
fly secrets set SECRET_ZERO_DEV_PG="..." AUTH_SECRET="..." SECRET_NEON_PG_AUTH="..." ADMIN="..."
```

## Development

```bash
cd services/api
bun install
bun run dev
```

