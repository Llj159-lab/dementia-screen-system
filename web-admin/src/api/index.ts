import { mockAssessments, mockLogs, mockPatients, mockUsers } from "@/mock/data";
import type { Assessment, OperationLog, Overview, PageResult, Patient, User } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";
const wait = (milliseconds = 180) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
  }
  const payload = await response.json() as { code: number; message: string; data: T };
  if (!response.ok || payload.code !== 0) throw new Error(payload.message || "请求失败");
  return payload.data;
}

function paginate<T>(items: T[], page = 1, pageSize = 10): PageResult<T> {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
}

function downloadBlob(content: BlobPart, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = fileName; anchor.click();
  URL.revokeObjectURL(url);
}

export const api = {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    if (!USE_MOCK) return request("/auth/web/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await wait();
    const user = mockUsers.find((item) => item.username === username);
    if (!user || password !== "Admin123!") throw new Error("用户名或密码错误（演示密码：Admin123!）");
    return { token: "mock-admin-token", user };
  },
  async overview(): Promise<Overview> {
    if (!USE_MOCK) return request("/statistics/overview");
    await wait();
    const scored = mockAssessments.filter((item) => item.scoreSummary.isAbnormal !== null);
    const abnormalTotal = scored.filter((item) => item.scoreSummary.isAbnormal).length;
    return {
      patientTotal: mockPatients.length,
      activePatientTotal: mockPatients.filter((item) => item.status === "active").length,
      assessmentTotal: mockAssessments.length,
      submittedAssessmentTotal: mockAssessments.filter((item) => item.status === "submitted").length,
      scoredAssessmentTotal: scored.length,
      abnormalTotal,
      abnormalRatio: scored.length ? abnormalTotal / scored.length : 0,
    };
  },
  async distribution(scaleCode = ""): Promise<Array<{ score: number; count: number }>> {
    if (!USE_MOCK) return (await request<{ distribution: Array<{ score: number; count: number }> }>(`/statistics/score-distribution${scaleCode ? `?scaleCode=${scaleCode}` : ""}`)).distribution;
    await wait();
    const counts = new Map<number, number>();
    mockAssessments.filter((item) => (!scaleCode || item.scaleCode === scaleCode) && item.scoreSummary.totalScore !== null)
      .forEach((item) => counts.set(item.scoreSummary.totalScore!, (counts.get(item.scoreSummary.totalScore!) ?? 0) + 1));
    return [...counts].map(([score, count]) => ({ score, count })).sort((a, b) => a.score - b.score);
  },
  async patients(params: { page: number; pageSize: number; keyword?: string; gender?: string; status?: string }): Promise<PageResult<Patient>> {
    if (!USE_MOCK) return request(`/patients?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)])).toString()}`);
    await wait();
    const keyword = params.keyword?.toLowerCase() ?? "";
    const items = mockPatients.filter((item) =>
      (!keyword || item.name.toLowerCase().includes(keyword) || item.patientCode.toLowerCase().includes(keyword)) &&
      (!params.gender || item.gender === params.gender) && (!params.status || item.status === params.status));
    return paginate(items, params.page, params.pageSize);
  },
  async savePatient(patient: Partial<Patient> & Pick<Patient, "patientCode" | "name">): Promise<Patient> {
    if (!USE_MOCK) {
      const path = patient.patientId ? `/patients/${patient.patientId}` : "/patients";
      return (await request<{ patient: Patient }>(path, { method: patient.patientId ? "PATCH" : "POST", body: JSON.stringify(patient) })).patient;
    }
    await wait();
    const timestamp = new Date().toISOString();
    if (patient.patientId) {
      const index = mockPatients.findIndex((item) => item.patientId === patient.patientId);
      mockPatients[index] = { ...mockPatients[index], ...patient, updatedAt: timestamp };
      return mockPatients[index];
    }
    const created: Patient = {
      patientId: `patient-${Date.now()}`, patientCode: patient.patientCode, name: patient.name,
      gender: patient.gender ?? null, birthDate: patient.birthDate ?? null,
      educationYears: patient.educationYears ?? null, profile: patient.profile ?? {},
      status: patient.status ?? "active", createdAt: timestamp, updatedAt: timestamp,
    };
    mockPatients.unshift(created); return created;
  },
  async deletePatient(patientId: string): Promise<void> {
    if (!USE_MOCK) { await request(`/patients/${patientId}`, { method: "DELETE" }); return; }
    await wait(); const index = mockPatients.findIndex((item) => item.patientId === patientId);
    if (mockAssessments.some((item) => item.patientId === patientId)) throw new Error("该患者已有测评记录，请改为归档");
    if (index >= 0) mockPatients.splice(index, 1);
  },
  async assessments(params: { page: number; pageSize: number; keyword?: string; scaleCode?: string; status?: string }): Promise<PageResult<Assessment>> {
    if (!USE_MOCK) {
      const query = new URLSearchParams(Object.entries(params).filter(([key, value]) => key !== "keyword" && value !== "").map(([key, value]) => [key, String(value)])).toString();
      const result = await request<PageResult<Assessment>>(`/assessments?${query}`);
      const patients = await api.patients({ page: 1, pageSize: 200, keyword: params.keyword });
      return { ...result, items: result.items.map((item) => {
        const patient = patients.items.find((candidate) => candidate.patientId === item.patientId);
        return { ...item, patientCode: patient?.patientCode, patientName: patient?.name };
      }) };
    }
    await wait(); const keyword = params.keyword?.toLowerCase() ?? "";
    const items = mockAssessments.filter((item) =>
      (!keyword || item.patientName?.toLowerCase().includes(keyword) || item.patientCode?.toLowerCase().includes(keyword)) &&
      (!params.scaleCode || item.scaleCode === params.scaleCode) && (!params.status || item.status === params.status));
    return paginate(items, params.page, params.pageSize);
  },
  async assessment(id: string): Promise<{ assessment: Assessment; patient: Patient | null }> {
    if (!USE_MOCK) return request(`/assessments/${id}`);
    await wait(); const assessment = mockAssessments.find((item) => item.assessmentId === id);
    if (!assessment) throw new Error("测评记录不存在");
    return { assessment, patient: mockPatients.find((item) => item.patientId === assessment.patientId) ?? null };
  },
  async accounts(): Promise<User[]> {
    if (!USE_MOCK) return (await request<{ accounts: User[] }>("/system/accounts")).accounts;
    await wait(); return [...mockUsers];
  },
  async saveAccount(account: Partial<User> & { username?: string | null; password?: string; displayName: string }): Promise<User> {
    if (!USE_MOCK) {
      const path = account.userId ? `/system/accounts/${account.userId}` : "/system/accounts";
      return (await request<{ account: User }>(path, { method: account.userId ? "PATCH" : "POST", body: JSON.stringify(account) })).account;
    }
    await wait();
    if (account.userId) {
      const index = mockUsers.findIndex((item) => item.userId === account.userId);
      mockUsers[index] = { ...mockUsers[index], ...account } as User; return mockUsers[index];
    }
    const created = { userId: `user-${Date.now()}`, username: account.username ?? null, displayName: account.displayName,
      roleCodes: account.roleCodes ?? ["evaluator"], status: account.status ?? "active", lastLoginAt: null } as User;
    mockUsers.push(created); return created;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!USE_MOCK) { await request("/system/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }); return; }
    await wait(); if (currentPassword !== "Admin123!") throw new Error("当前密码不正确");
  },
  async logs(params: { page: number; pageSize: number; action?: string }): Promise<PageResult<OperationLog>> {
    if (!USE_MOCK) return request(`/system/operation-logs?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)])).toString()}`);
    await wait(); return paginate(mockLogs.filter((item) => !params.action || item.action === params.action), params.page, params.pageSize);
  },
  async downloadPdf(id: string): Promise<void> {
    // Mock 模式使用浏览器打印功能，可在打印面板中选择“另存为 PDF”。
    // 真实模式则下载任务3后端生成的标准 PDF 文件。
    if (USE_MOCK) { window.print(); return; }
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/reports/assessments/${id}.pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    downloadBlob(await response.blob(), `assessment-${id}.pdf`, "application/pdf");
  },
  async downloadExcel(): Promise<void> {
    if (USE_MOCK) {
      const rows = ["患者编号,姓名,量表,得分,结果", ...mockAssessments.map((item) => `${item.patientCode},${item.patientName},${item.scaleCode},${item.scoreSummary.totalScore ?? "待评分"},${item.scoreSummary.resultLabel ?? "待判定"}`)];
      downloadBlob(`\uFEFF${rows.join("\n")}`, "测评记录.csv", "text/csv;charset=utf-8"); return;
    }
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/reports/assessments.xls`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    downloadBlob(await response.blob(), "测评记录.xls", "application/vnd.ms-excel");
  },
};
