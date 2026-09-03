# Cloud Development Setup

## What is verified locally

- The backend schema and local user store are implemented.
- No CloudBase CLI was found on this machine.
- The user supplied the CloudBase environment ID `ad-scd-dev-d1g1y08v5962945fd`.
- No Tencent Cloud credential or WeChat application credential is available to this workspace.
- Therefore no cloud database connection, cloud function, or cloud storage deployment has been performed by this agent.
- The user later provided screenshots showing PostgreSQL tables, the private bucket
  `ad-scd-files`, and two `storage.objects` policies for the `authenticated` role.
  These are user-provided results and were not directly executed by this agent.

## Configuration record

1. Environment: `ad-scd-dev-d1g1y08v5962945fd`.
2. Database: PostgreSQL; the seven application tables were created by the project owner.
3. Storage bucket: `ad-scd-files`, configured as private.
4. Storage prefixes: `scale-assets/` and `assessment-reports/`.
5. `storage.objects` policies allow `authenticated` users to read and upload.
6. The health-check function was deployed by the project owner.
7. Provider credentials must remain in Tencent Cloud secrets or local ignored
   environment variables, never in source files.

## Integration values

```text
CLOUD_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
cloud database type=PostgreSQL
cloud function entry format=index.main
storage bucket or environment storage name=ad-scd-files
mini-program app identity configuration=
web admin domain or local development origin=
```

## Important limitation

Setting `CLOUD_ENV_ID` alone does not connect the TypeScript application. The current
Node.js service deliberately reports local adapters until a database and storage
adapter is implemented.
