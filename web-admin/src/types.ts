export type RoleCode = "admin" | "researcher" | "evaluator";
export type User = {
  userId: string; username: string | null; displayName: string;
  roleCodes: RoleCode[]; status: "active" | "disabled" | "pending"; lastLoginAt: string | null;
};
export type Patient = {
  patientId: string; patientCode: string; name: string;
  gender: "male" | "female" | "unknown" | null; birthDate: string | null;
  educationYears: number | null; profile: Record<string, unknown>;
  status: "active" | "archived"; createdAt: string; updatedAt: string;
};
export type ScoreSummary = {
  totalScore: number | null; maximumScore: number | null; resultLabel: string | null;
  isAbnormal: boolean | null; scoringStatus: "calculated" | "pending_task1_engine";
};
export type Assessment = {
  assessmentId: string; patientId: string; patientCode?: string; patientName?: string;
  scaleCode: string; scaleVersion: string; status: string; assessorId: string;
  submittedAt: string | null; createdAt: string; durationSeconds: number | null;
  scoreSummary: ScoreSummary; answerCount?: number;
  answers?: Array<{ answerId: string; itemCode: string; optionCode: string | null; answerStatus: string }>;
};
export type Overview = {
  patientTotal: number; activePatientTotal: number; assessmentTotal: number;
  submittedAssessmentTotal: number; scoredAssessmentTotal: number;
  abnormalTotal: number; abnormalRatio: number;
};
export type PageResult<T> = { items: T[]; page: number; pageSize: number; total: number };
export type OperationLog = {
  logId: string; userId: string | null; action: string; resourceType: string;
  resourceId: string | null; requestId: string; createdAt: string;
};
