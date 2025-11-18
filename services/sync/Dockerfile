# Dockerfile for Zero sync service
# Use the official Zero Docker image as base
# Docker tag 0.24.3000000000 corresponds to npm package @rocicorp/zero@0.24.x
FROM rocicorp/zero:0.24.3000000000

WORKDIR /app

# Override ENTRYPOINT to allow CMD override
# The Zero image likely has an ENTRYPOINT that we need to clear
ENTRYPOINT []

# Start zero-cache with required flags
# Required: --upstream-db (database connection)
# Required: --replica-file (SQLite replica location in /data mount)
# Required in production: --admin-password (for debugging access)
# Required: --auth-secret (for JWT verification)
# Required: --get-queries-url (for synced queries)
# Required: --push-url (for custom mutators)
# Cookie forwarding: --get-queries-forward-cookies and --mutate-forward-cookies
# Note: Schema is deployed separately via zero-deploy-permissions
CMD ["sh", "-c", "zero-cache --upstream-db=\"${ZERO_UPSTREAM_DB}\" --replica-file=/data/zero-replica.db --admin-password=\"${ZERO_ADMIN_PASSWORD}\" --auth-secret=\"${ZERO_AUTH_SECRET}\" --get-queries-url=\"${ZERO_GET_QUERIES_URL}\" --push-url=\"${ZERO_PUSH_URL}\" --get-queries-forward-cookies --mutate-forward-cookies"]

