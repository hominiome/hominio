# Use Bun image (pinned to specific version for consistency)
FROM oven/bun:1.3.2 as base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
# Copy root package.json and lockfile for monorepo workspace resolution
COPY package.json bun.lock* /temp/dev/
# Copy workspace package.json files and source
COPY services/wallet/package.json /temp/dev/services/wallet/
COPY libs/hominio-auth/ /temp/dev/libs/hominio-auth/
COPY libs/hominio-caps/ /temp/dev/libs/hominio-caps/
COPY libs/hominio-brand/ /temp/dev/libs/hominio-brand/
COPY libs/hominio-voice/ /temp/dev/libs/hominio-voice/
COPY libs/hominio-vibes/ /temp/dev/libs/hominio-vibes/
COPY libs/hominio-zero/ /temp/dev/libs/hominio-zero/
RUN cd /temp/dev && bun install --ignore-scripts

# Build the app
FROM base AS build
# Copy node_modules from install stage
COPY --from=install /temp/dev/node_modules /app/node_modules
# Copy workspace structure (libs for @hominio/auth)
COPY --from=install /temp/dev/libs /app/libs
# Copy wallet service files
COPY services/wallet/ .
# Sync brand assets to static folder before build
RUN node libs/hominio-brand/scripts/sync-assets.js
RUN cd /app && bun run build

# Production image
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=build /app/build build
COPY --from=build /app/package.json .
# Copy libs for runtime (needed for @hominio/auth)
COPY --from=build /app/libs libs
# Copy scripts directory for migration script
COPY --from=build /app/scripts scripts
# Copy auth.migrate.ts for BetterAuth CLI migrations
COPY --from=build /app/auth.migrate.ts auth.migrate.ts

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Start the app using Bun (adapter-node creates build/index.js)
CMD ["bun", "build/index.js"]

