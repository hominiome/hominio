# Sync Service

Zero sync service for Hominio monorepo. This service runs the Zero cache server that syncs data between clients and the Postgres database.

## Architecture

- **Client** → Connects directly to Zero sync service (`sync.hominio.me` or `localhost:4203`)
- **Zero sync** → Forwards cookies to API service for authentication
- **API service** → Handles get-queries and push endpoints (uses Better Auth cookies from wallet service)

## Port

- **Development**: `4203` (Note: Zero cache runs on port 4848 internally, but we use 4203 for consistency)
- **Production**: `sync.hominio.me` (port 4848 internally)

## Environment Variables

Set these in Fly.io secrets:

- `ZERO_UPSTREAM_DB` - Postgres connection string (non-pooler, same as API service)
- `ZERO_AUTH_SECRET` - JWT secret (same as `AUTH_SECRET` from wallet service)
- `ZERO_GET_QUERIES_URL` - `https://api.hominio.me/api/v0/zero/get-queries`
- `ZERO_PUSH_URL` - `https://api.hominio.me/api/v0/zero/push`
- `ZERO_ADMIN_PASSWORD` - Admin password for debugging

## Deployment

```bash
cd services/sync
fly deploy -c fly.toml
fly secrets set ZERO_UPSTREAM_DB="..." ZERO_AUTH_SECRET="..." ZERO_GET_QUERIES_URL="..." ZERO_PUSH_URL="..." ZERO_ADMIN_PASSWORD="..."
```

## Migration

Run migration to set up database schema:

```bash
cd services/sync
bun run migrate
```

Requires `SECRET_ZERO_DEV_PG` environment variable (same as `ZERO_UPSTREAM_DB`).
