# AD SCD Backend

This directory contains the backend foundation for the AD preclinical SCD screening project.

## Current scope

- TypeScript service skeleton
- Unified JSON response shape
- Request ID propagation through `X-Request-Id`
- Health check endpoint
- CORS response headers for local frontend integration
- Versioned database schema with five core collections and two service extensions
- Local persistent user store for development
- Explicit local-only/not-connected status for database and object storage
- PostgreSQL migration for the assignment database

## Local run

```text
npm install
npm run typecheck
npm run db:validate
npm run start
```

The health endpoint is:

```text
GET http://localhost:3000/api/v1/health
```

The database schema is defined in `src/database/schema.ts`. `npm run db:validate` checks collection names, fields, enum definitions, and indexes.

On first start, the development auth layer creates `data/users.json` with three demo accounts. This is a local persistence adapter, not the cloud database.

The local service does not claim that a cloud database, cloud storage bucket, authentication service, or cloud function has been configured. The health endpoint reports the schema version and collection count separately from connection status.

For cloud-function deployment and operations, see `docs/deployment-ops.md`.
The dependency-free smoke-test function is under
`cloud-functions/ad-scd-health`.

The formal API and database documentation is under `docs/`.
