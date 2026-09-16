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
- Local-file and CloudBase RDB/storage runtime adapters selected by environment variables
- PostgreSQL migration for the assignment database
- Task 3 patient, assessment, statistics, report, account, and audit APIs
- Task-1 scoring integration for all six scales, including Morris CDR and CDR-SB
- Automated business-API integration tests

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

On first start in local mode, the development auth layer creates `data/users.json` with three demo accounts. Set `DATA_DRIVER=cloudbase` and `STORAGE_DRIVER=cloudbase` to use the task-2 CloudBase services. The health endpoint reports each active adapter and its connection status.

For cloud-function deployment and operations, see `docs/deployment-ops.md`.
The dependency-free smoke-test function is under
`cloud-functions/ad-scd-health`.

Task-package 1 scale data has been converted for PostgreSQL under
`fixtures/task1-scale-configs.json` and `sql/004_seed_scale_configs.sql`.
See `docs/task1-conversion.md` before importing it.
Existing databases must also run `sql/005_add_answer_option_code.sql` before the integrated backend is deployed.

Task 3 endpoint details and the exact task-1/task-2 integration boundary are documented in
`docs/task3-business-api.md`.

CloudBase database, authentication, storage, and deployment integration are documented in
`docs/cloud-integration.md`. The formal API and database documentation is under `docs/`.
