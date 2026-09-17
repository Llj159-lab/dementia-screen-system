# Task 3 Business API

This document is the handoff contract for the Web administration frontend and the mini-program frontend. All JSON endpoints use the common response envelope documented in `api.md` and require `Authorization: Bearer <token>` unless stated otherwise.

## Run and verify

```text
npm ci
npm run typecheck
npm run db:validate
npm test
npm start
```

Local development persists business demo data in `data/business.json` and user data in `data/users.json`. Set `LOCAL_DATA_DIR` to move these files. In the CloudBase deployment, authentication and file metadata use the CloudBase PostgreSQL and object-storage adapters; the business demo store remains a replaceable local adapter for this coursework integration.

## Endpoint summary

| Module | Method and path | Permission | Purpose |
| --- | --- | --- | --- |
| Scale | `GET /api/v1/scales` | `scale:read` | List the six task-1 scale configurations |
| Scale | `GET /api/v1/scales/{scaleCode}` | `scale:read` | Get questions, options and scoring metadata |
| Patient | `GET /api/v1/patients` | `patient:read` | Paginated multi-condition search |
| Patient | `POST /api/v1/patients` | `patient:create` | Create a patient |
| Patient | `GET /api/v1/patients/{patientId}` | `patient:read` | Patient details |
| Patient | `PUT/PATCH /api/v1/patients/{patientId}` | `patient:update` | Update a patient |
| Patient | `DELETE /api/v1/patients/{patientId}` | `patient:delete` | Delete a patient with no assessments |
| Assessment | `POST /api/v1/assessments` | `assessment:create` | Save answers and submit an assessment |
| Assessment | `GET /api/v1/assessments` | `assessment:read` | Paginated assessment search |
| Assessment | `GET /api/v1/assessments/{assessmentId}` | `assessment:read` | Assessment, answers and patient details |
| Statistics | `GET /api/v1/statistics/overview` | `assessment:read` | Dashboard totals and abnormal ratio |
| Statistics | `GET /api/v1/statistics/score-distribution` | `assessment:read` | ECharts-ready score/count array |
| Report | `GET /api/v1/reports/assessments/{assessmentId}.pdf` | `report:export` | Single PDF report |
| Report | `GET /api/v1/reports/assessments.xls` | `report:export` | Filtered Excel-compatible batch export |
| Account | `GET /api/v1/system/accounts` | `system:admin` | Account list without password hashes |
| Account | `POST /api/v1/system/accounts` | `system:admin` | Create a Web account |
| Account | `PATCH /api/v1/system/accounts/{userId}` | `system:admin` | Update display name, roles or status |
| Account | `PUT /api/v1/system/password` | authenticated | Change the current user's password |
| Audit | `GET /api/v1/system/operation-logs` | `operation_log:read` | Search operation logs |

## Patients

List query parameters: `page`, `pageSize` (maximum 200), `keyword` (matches patient code or name), `gender`, and `status`.

Create example:

```json
{
  "patientCode": "SCD-2026-001",
  "name": "示例患者",
  "gender": "female",
  "birthDate": "1958-06-01",
  "educationYears": 9,
  "idNumberCiphertext": null,
  "phoneCiphertext": null,
  "profile": {
    "occupation": "retired",
    "source": "outpatient"
  }
}
```

Do not send plaintext identity-card or phone values in the ciphertext fields. Production encryption belongs in the task-2 database adapter. Deletion is rejected when assessment records refer to a patient; update `status` to `archived` instead.

## Assessments and scoring boundary

Create/submit example:

```json
{
  "patientId": "patient-uuid",
  "scaleCode": "SCD_Q9",
  "scaleVersion": "1.0",
  "status": "submitted",
  "durationSeconds": 180,
  "answers": [
    {
      "itemCode": "SCD_Q9_01",
      "optionCode": "否",
      "answerStatus": "answered",
      "value": {},
      "observation": {}
    }
  ]
}
```

For `submitted` records, required items and option codes are validated against `fixtures/task1-scale-configs.json`. `SUM` and `ITEMIZED` configurations are calculated only from option scores supplied by task 1; education-dependent cutoffs also use task-1 metadata. No clinical thresholds are invented here.

CDR uses the task-1 Morris (1993) algorithm with memory as the primary domain and the other five domains as secondary domains. The response includes the global CDR in `totalScore`, domain scores in `subScores`, and CDR-SB in `extra.cdrSumOfBoxes`. All six scales now return `scoringStatus: calculated` for valid submitted answers.

Assessment list query parameters: `page`, `pageSize`, `patientId`, `scaleCode`, `status`, `from`, and `to`. Dates are ISO 8601 strings.

## Statistics

`GET /statistics/overview` returns:

```json
{
  "patientTotal": 12,
  "activePatientTotal": 11,
  "assessmentTotal": 30,
  "submittedAssessmentTotal": 28,
  "scoredAssessmentTotal": 27,
  "abnormalTotal": 8,
  "abnormalRatio": 0.2963
}
```

The abnormal ratio denominator contains only assessments whose task-1 configuration produced a non-null abnormal result. Pending CDR results therefore do not distort the dashboard.

`GET /statistics/score-distribution?scaleCode=MMSE` returns `distribution: [{ "score": 18, "count": 2 }]` sorted by score.

## Reports

PDF output is generated without an external service and uses the PDF standard Chinese font name `STSong-Light`. The report contains a screening-only disclaimer.

The batch endpoint returns SpreadsheetML with the `.xls` extension and `application/vnd.ms-excel`; it opens directly in Microsoft Excel and preserves Chinese text. It accepts the same filtering parameters as the assessment list. If the final acceptance rubric strictly requires `.xlsx`, replace `createAssessmentsExcel` with the team's approved XLSX library after dependencies are agreed.

## Accounts and audit logs

Create-account fields are `username`, `password` (minimum eight characters), `displayName`, `roleCodes`, and optional `status`. Allowed roles are `admin`, `researcher`, and `evaluator`. Password hashes never appear in API responses.

Password change body:

```json
{
  "currentPassword": "old password",
  "newPassword": "new password"
}
```

All sessions for the user are revoked after a password change. Operation logs are written for patient changes, assessment submission, report exports, account changes, and password changes. Log queries support `page`, `pageSize`, `action`, and `userId`.

## Integration note

The endpoint contract is stable for the Web backend and mini-program. The current coursework deployment uses CloudBase adapters for authentication, PostgreSQL-backed file metadata, and private object storage. `LocalBusinessStore` supplies backend business records in the current coursework version; it can be replaced later without changing the frontend API contract.
