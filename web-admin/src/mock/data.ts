import type { Assessment, OperationLog, Patient, User } from "@/types";

const now = Date.now();
const isoDaysAgo = (days: number) => new Date(now - days * 86400000).toISOString();

export const mockUsers: User[] = [
  { userId: "usr_demo_admin", username: "admin_demo", displayName: "系统管理员", roleCodes: ["admin"], status: "active", lastLoginAt: isoDaysAgo(0) },
  { userId: "usr_demo_researcher", username: "researcher_demo", displayName: "研究员张老师", roleCodes: ["researcher"], status: "active", lastLoginAt: isoDaysAgo(1) },
  { userId: "usr_demo_evaluator", username: "evaluator_demo", displayName: "测评员李老师", roleCodes: ["evaluator"], status: "active", lastLoginAt: isoDaysAgo(2) },
];

export const mockPatients: Patient[] = Array.from({ length: 24 }, (_, index) => ({
  patientId: `patient-${index + 1}`,
  patientCode: `SCD-2026-${String(index + 1).padStart(3, "0")}`,
  name: ["王春梅", "李建国", "赵兰芳", "陈志强", "周秀英", "吴国华"][index % 6],
  gender: index % 3 === 0 ? "female" : "male",
  birthDate: `${1948 + (index % 18)}-${String((index % 9) + 1).padStart(2, "0")}-15`,
  educationYears: [0, 6, 9, 12, 16][index % 5],
  profile: { source: ["门诊", "社区筛查", "健康体检"][index % 3] },
  status: index === 20 ? "archived" : "active",
  createdAt: isoDaysAgo(24 - index), updatedAt: isoDaysAgo(index % 5),
}));

const scales = ["SCD_Q9", "GDS", "FAQ", "MMSE", "MOCA_B", "CDR"];
export const mockAssessments: Assessment[] = Array.from({ length: 42 }, (_, index) => {
  const patient = mockPatients[index % mockPatients.length];
  const scaleCode = scales[index % scales.length];
  const max = scaleCode === "SCD_Q9" ? 9 : scaleCode === "GDS" ? 15 : scaleCode === "CDR" ? 3 : 30;
  const pending = scaleCode === "CDR";
  const score = pending ? null : Math.min(max, Math.round(max * (0.35 + ((index * 7) % 60) / 100)));
  const abnormal = pending ? null : scaleCode === "MMSE" || scaleCode === "MOCA_B" ? score! <= 22 : score! >= max * 0.6;
  return {
    assessmentId: `assessment-${index + 1}`, patientId: patient.patientId,
    patientCode: patient.patientCode, patientName: patient.name, scaleCode, scaleVersion: "1.0",
    status: "submitted", assessorId: mockUsers[(index % 2) + 1].userId,
    submittedAt: isoDaysAgo(index % 28), createdAt: isoDaysAgo(index % 28), durationSeconds: 180 + index * 13,
    answerCount: scaleCode === "CDR" ? 6 : scaleCode === "GDS" ? 15 : scaleCode === "SCD_Q9" ? 9 : 30,
    scoreSummary: {
      totalScore: score, maximumScore: max, resultLabel: pending ? null : abnormal ? "筛查异常" : "筛查未见异常",
      isAbnormal: abnormal, scoringStatus: pending ? "pending_task1_engine" : "calculated",
    },
    answers: Array.from({ length: 6 }, (_, answerIndex) => ({
      answerId: `${index}-${answerIndex}`, itemCode: `${scaleCode}_${String(answerIndex + 1).padStart(2, "0")}`,
      optionCode: String(answerIndex % 2), answerStatus: "answered",
    })),
  };
});

export const mockLogs: OperationLog[] = Array.from({ length: 36 }, (_, index) => ({
  logId: `log-${index + 1}`, userId: mockUsers[index % 3].userId,
  action: ["patient.create", "patient.update", "assessment.create", "report.export_pdf", "account.update"][index % 5],
  resourceType: ["patient", "patient", "assessment", "assessment", "user"][index % 5],
  resourceId: `resource-${index + 1}`, requestId: `request-${index + 1}`, createdAt: isoDaysAgo(index / 4),
}));
