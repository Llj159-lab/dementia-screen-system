import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getRdbClient } from "../cloudbase.js";
import type { Assessment, BusinessData, OperationLog, Patient } from "./types.js";

const EMPTY_DATA: BusinessData = { patients: [], assessments: [], operationLogs: [] };

export class LocalBusinessStore {
  private data: BusinessData;

  constructor(
    private readonly filePath = resolve(
      process.env.LOCAL_DATA_DIR ?? resolve(process.cwd(), "data"),
      "business.json",
    ),
  ) {
    this.data = this.load();
  }

  private load(): BusinessData {
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<BusinessData>;
      return {
        patients: Array.isArray(parsed.patients) ? parsed.patients : [],
        assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
        operationLogs: Array.isArray(parsed.operationLogs) ? parsed.operationLogs : [],
      };
    } catch (error) {
      const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
      if (!missing) throw error;
      this.persist(EMPTY_DATA);
      return structuredClone(EMPTY_DATA);
    }
  }

  private persist(data: BusinessData = this.data): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, this.filePath);
  }

  listPatients(): Patient[] { return this.data.patients; }
  findPatient(patientId: string): Patient | undefined {
    return this.data.patients.find((item) => item.patientId === patientId);
  }
  findPatientByCode(patientCode: string): Patient | undefined {
    return this.data.patients.find((item) => item.patientCode === patientCode);
  }
  savePatient(patient: Patient): Patient {
    const index = this.data.patients.findIndex((item) => item.patientId === patient.patientId);
    if (index >= 0) this.data.patients[index] = patient;
    else this.data.patients.push(patient);
    this.persist();
    return patient;
  }
  deletePatient(patientId: string): boolean {
    const oldLength = this.data.patients.length;
    this.data.patients = this.data.patients.filter((item) => item.patientId !== patientId);
    if (oldLength === this.data.patients.length) return false;
    this.persist();
    return true;
  }

  listAssessments(): Assessment[] { return this.data.assessments; }
  findAssessment(assessmentId: string): Assessment | undefined {
    return this.data.assessments.find((item) => item.assessmentId === assessmentId);
  }
  saveAssessment(assessment: Assessment): Assessment {
    const index = this.data.assessments.findIndex(
      (item) => item.assessmentId === assessment.assessmentId,
    );
    if (index >= 0) this.data.assessments[index] = assessment;
    else this.data.assessments.push(assessment);
    this.persist();
    return assessment;
  }

  addLog(input: Omit<OperationLog, "logId" | "createdAt" | "updatedAt">): OperationLog {
    const timestamp = new Date().toISOString();
    const log: OperationLog = {
      logId: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.data.operationLogs.push(log);
    this.persist();
    return log;
  }
  listLogs(): OperationLog[] { return this.data.operationLogs; }

  getStatus(): { mode: "local_file"; persistent: true; filePath: string } {
    return { mode: "local_file", persistent: true, filePath: this.filePath };
  }
}

type Awaitable<T> = T | Promise<T>;
export type BusinessStore = {
  listPatients(): Awaitable<Patient[]>;
  findPatient(patientId: string): Awaitable<Patient | undefined>;
  findPatientByCode(patientCode: string): Awaitable<Patient | undefined>;
  savePatient(patient: Patient): Awaitable<Patient>;
  deletePatient(patientId: string): Awaitable<boolean>;
  listAssessments(): Awaitable<Assessment[]>;
  findAssessment(assessmentId: string): Awaitable<Assessment | undefined>;
  saveAssessment(assessment: Assessment): Awaitable<Assessment>;
  addLog(input: Omit<OperationLog, "logId" | "createdAt" | "updatedAt">): Awaitable<OperationLog>;
  listLogs(): Awaitable<OperationLog[]>;
  getStatus(): Awaitable<Record<string, unknown>>;
};

type PatientRow = {
  patient_id: string; patient_code: string; name: string; id_number_ciphertext: string | null;
  phone_ciphertext: string | null; gender: Patient["gender"]; birth_date: string | null;
  education_years: number | null; profile: Record<string, unknown>; status: Patient["status"];
  created_at: string; updated_at: string;
};
type AssessmentRow = {
  assessment_id: string; patient_id: string; scale_code: string; scale_version: string;
  assessor_id: string; informant_id: string | null; status: Assessment["status"];
  started_at: string | null; submitted_at: string | null; duration_seconds: number | null;
  score_summary: Assessment["scoreSummary"]; algorithm_version: string | null;
  reviewer_note: string | null; created_at: string; updated_at: string;
};
type AnswerRow = {
  answer_id: string; assessment_id: string; item_code: string; option_code: string | null;
  value: Record<string, unknown>; answer_status: Assessment["answers"][number]["answerStatus"];
  observation: Record<string, unknown>; recorded_by: string; created_at: string; updated_at: string;
};
type LogRow = {
  log_id: string; user_id: string | null; action: string; resource_type: string;
  resource_id: string | null; request_id: string; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
};

const patientFromRow = (row: PatientRow): Patient => ({
  patientId: row.patient_id, patientCode: row.patient_code, name: row.name,
  idNumberCiphertext: row.id_number_ciphertext, phoneCiphertext: row.phone_ciphertext,
  gender: row.gender, birthDate: row.birth_date, educationYears: row.education_years,
  profile: row.profile ?? {}, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
});
const patientToRow = (item: Patient): PatientRow => ({
  patient_id: item.patientId, patient_code: item.patientCode, name: item.name,
  id_number_ciphertext: item.idNumberCiphertext, phone_ciphertext: item.phoneCiphertext,
  gender: item.gender, birth_date: item.birthDate, education_years: item.educationYears,
  profile: item.profile, status: item.status, created_at: item.createdAt, updated_at: item.updatedAt,
});
const assessmentFromRow = (row: AssessmentRow, answers: AnswerRow[]): Assessment => ({
  assessmentId: row.assessment_id, patientId: row.patient_id, scaleCode: row.scale_code,
  scaleVersion: row.scale_version, assessorId: row.assessor_id, informantId: row.informant_id,
  status: row.status, startedAt: row.started_at, submittedAt: row.submitted_at,
  durationSeconds: row.duration_seconds, scoreSummary: row.score_summary,
  algorithmVersion: row.algorithm_version, reviewerNote: row.reviewer_note,
  answers: answers.filter((a) => a.assessment_id === row.assessment_id).map((a) => ({
    answerId: a.answer_id, assessmentId: a.assessment_id, itemCode: a.item_code,
    optionCode: a.option_code, value: a.value ?? {}, answerStatus: a.answer_status,
    observation: a.observation ?? {}, recordedBy: a.recorded_by,
    createdAt: a.created_at, updatedAt: a.updated_at,
  })), createdAt: row.created_at, updatedAt: row.updated_at,
});
const assessmentToRow = (item: Assessment): AssessmentRow => ({
  assessment_id: item.assessmentId, patient_id: item.patientId, scale_code: item.scaleCode,
  scale_version: item.scaleVersion, assessor_id: item.assessorId, informant_id: item.informantId,
  status: item.status, started_at: item.startedAt, submitted_at: item.submittedAt,
  duration_seconds: item.durationSeconds, score_summary: item.scoreSummary,
  algorithm_version: item.algorithmVersion, reviewer_note: item.reviewerNote,
  created_at: item.createdAt, updated_at: item.updatedAt,
});

function ensureNoError(error: { message?: string } | null, operation: string): void {
  if (error) throw new Error(`CloudBase ${operation} failed: ${error.message ?? "unknown error"}`);
}

export class CloudBusinessStore implements BusinessStore {
  async listPatients(): Promise<Patient[]> {
    const { data, error } = await getRdbClient().from<PatientRow[]>("patients").select("*");
    ensureNoError(error, "patients query");
    return (data ?? []).map(patientFromRow);
  }
  async findPatient(patientId: string): Promise<Patient | undefined> {
    const { data, error } = await getRdbClient().from<PatientRow>("patients").select("*").eq("patient_id", patientId).limit(1).maybeSingle();
    ensureNoError(error, "patient query");
    return data ? patientFromRow(data) : undefined;
  }
  async findPatientByCode(patientCode: string): Promise<Patient | undefined> {
    const { data, error } = await getRdbClient().from<PatientRow>("patients").select("*").eq("patient_code", patientCode).limit(1).maybeSingle();
    ensureNoError(error, "patient code query");
    return data ? patientFromRow(data) : undefined;
  }
  async savePatient(patient: Patient): Promise<Patient> {
    const existing = await this.findPatient(patient.patientId);
    const query = existing
      ? getRdbClient().from("patients").update(patientToRow(patient)).eq("patient_id", patient.patientId)
      : getRdbClient().from("patients").insert(patientToRow(patient));
    const { error } = await query;
    ensureNoError(error, "patient save");
    return patient;
  }
  async deletePatient(patientId: string): Promise<boolean> {
    if (!(await this.findPatient(patientId))) return false;
    const { error } = await getRdbClient().from("patients").delete().eq("patient_id", patientId);
    ensureNoError(error, "patient delete");
    return true;
  }
  async listAssessments(): Promise<Assessment[]> {
    const [recordsResult, answersResult] = await Promise.all([
      getRdbClient().from<AssessmentRow[]>("assessment_records").select("*"),
      getRdbClient().from<AnswerRow[]>("assessment_answers").select("*"),
    ]);
    ensureNoError(recordsResult.error, "assessments query");
    ensureNoError(answersResult.error, "assessment answers query");
    return (recordsResult.data ?? []).map((row) => assessmentFromRow(row, answersResult.data ?? []));
  }
  async findAssessment(assessmentId: string): Promise<Assessment | undefined> {
    return (await this.listAssessments()).find((item) => item.assessmentId === assessmentId);
  }
  async saveAssessment(assessment: Assessment): Promise<Assessment> {
    const existing = await this.findAssessment(assessment.assessmentId);
    const recordQuery = existing
      ? getRdbClient().from("assessment_records").update(assessmentToRow(assessment)).eq("assessment_id", assessment.assessmentId)
      : getRdbClient().from("assessment_records").insert(assessmentToRow(assessment));
    const recordResult = await recordQuery;
    ensureNoError(recordResult.error, "assessment save");
    const deleteResult = await getRdbClient().from("assessment_answers").delete().eq("assessment_id", assessment.assessmentId);
    ensureNoError(deleteResult.error, "assessment answers replace");
    if (assessment.answers.length > 0) {
      const rows: AnswerRow[] = assessment.answers.map((answer) => ({
        answer_id: answer.answerId, assessment_id: answer.assessmentId, item_code: answer.itemCode,
        option_code: answer.optionCode, value: answer.value, answer_status: answer.answerStatus,
        observation: answer.observation, recorded_by: answer.recordedBy,
        created_at: answer.createdAt, updated_at: answer.updatedAt,
      }));
      const { error } = await getRdbClient().from("assessment_answers").insert(rows);
      ensureNoError(error, "assessment answers save");
    }
    return assessment;
  }
  async addLog(input: Omit<OperationLog, "logId" | "createdAt" | "updatedAt">): Promise<OperationLog> {
    const timestamp = new Date().toISOString();
    const log: OperationLog = { logId: randomUUID(), ...input, createdAt: timestamp, updatedAt: timestamp };
    const row: LogRow = { log_id: log.logId, user_id: log.userId, action: log.action,
      resource_type: log.resourceType, resource_id: log.resourceId, request_id: log.requestId,
      metadata: log.metadata, created_at: log.createdAt, updated_at: log.updatedAt };
    const { error } = await getRdbClient().from("operation_logs").insert(row);
    ensureNoError(error, "operation log insert");
    return log;
  }
  async listLogs(): Promise<OperationLog[]> {
    const { data, error } = await getRdbClient().from<LogRow[]>("operation_logs").select("*");
    ensureNoError(error, "operation logs query");
    return (data ?? []).map((row) => ({ logId: row.log_id, userId: row.user_id, action: row.action,
      resourceType: row.resource_type, resourceId: row.resource_id, requestId: row.request_id,
      metadata: row.metadata ?? {}, createdAt: row.created_at, updatedAt: row.updated_at }));
  }
  async getStatus(): Promise<Record<string, unknown>> {
    try {
      const { error } = await getRdbClient().from("patients").select("patient_id").limit(1);
      ensureNoError(error, "business store status");
      return { mode: "cloudbase_rdb", persistent: true, status: "connected" };
    } catch (error) {
      return { mode: "cloudbase_rdb", persistent: true, status: "error",
        error: error instanceof Error ? error.message : "unknown error" };
    }
  }
}

export function createBusinessStore(): BusinessStore {
  return process.env.DATA_DRIVER === "cloudbase" ? new CloudBusinessStore() : new LocalBusinessStore();
}
