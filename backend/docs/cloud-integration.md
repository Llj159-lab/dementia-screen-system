# Task 2 Cloud Integration

## Runtime modes

Local development is the default. Cloud mode must be enabled explicitly:

```env
DATA_DRIVER=cloudbase
STORAGE_DRIVER=cloudbase
CLOUDBASE_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
STORAGE_BUCKET=ad-scd-files
JWT_SECRET=<a-long-random-secret>
CORS_ORIGINS=http://localhost:5173
```

In cloud mode, users, patients, assessment records and answers, operation logs,
file metadata, and binary file content use the task-2 CloudBase services. Run
`sql/005_add_answer_option_code.sql` once for databases created from an earlier schema.

CloudBase credentials are optional. In same-environment CloudBase hosting, first use
the workload identity without long-lived CAM keys. Only set
`CLOUDBASE_SECRETID` and `CLOUDBASE_SECRETKEY` when deployment logs explicitly
show that credentials are required. Never commit their values.

## Test users

Generate a password hash locally:

```text
npm run auth:hash -- <password>
```

Insert two course-assignment users in CloudBase SQL Editor. Replace only the hash
placeholders; do not store plaintext passwords.

```sql
INSERT INTO users (user_id, auth_provider, username, password_hash, display_name, role_codes, status)
VALUES
  ('usr_test_admin', 'web', 'admin_test', '<ADMIN_HASH>', 'Test Administrator', ARRAY['admin'], 'active'),
  ('usr_test_researcher', 'web', 'researcher_test', '<RESEARCHER_HASH>', 'Test Researcher', ARRAY['researcher'], 'active')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role_codes = EXCLUDED.role_codes,
  status = 'active',
  updated_at = NOW();
```

Share passwords privately with task 3 and task 5 owners. Do not put passwords in
Git, screenshots, issue comments, or group chat.

## CloudBase hosting

Deploy the `backend` directory as one Node.js service using Node 20 or later:

```text
Install command: npm ci
Start command: npm start
Container port: 3000
```

Configure the environment variables shown above in the service settings. Set
`CORS_ORIGINS` to the task 5 development and deployed origins, comma-separated.
Do not use `*`.

## Acceptance checks

1. `GET /api/v1/health` reports `cloudbase_rdb/connected` and
   `cloudbase/connected`.
2. `POST /api/v1/auth/web/login` works for both test users.
3. `GET /api/v1/auth/me` accepts the returned JWT; an invalid token returns 401.
4. Upload a non-sensitive PDF through `POST /api/v1/files` and verify its metadata
   appears in PostgreSQL `files`.
5. Verify the uploaded object appears under `scale-assets/` or
   `assessment-reports/` in the intended private bucket. The SDK selects storage
   through the CloudBase environment and does not accept a bucket argument.
6. Download the object through `GET /api/v1/files/:fileId/download`.
7. Verify allowed origins receive `Access-Control-Allow-Origin`; other origins do
   not.

The backend URL is only complete after the CloudBase service is deployed and its
public access URL is recorded.
