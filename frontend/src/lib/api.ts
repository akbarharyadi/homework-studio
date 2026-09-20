// Typed client for the Homework Studio Go API. One tiny fetch wrapper; the JWT
// is kept in localStorage and attached as a Bearer token.

const TOKEN_KEY = "hs_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(opts.body instanceof FormData) && opts.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`/api/v1${path}`, { ...opts, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message || res.statusText);
  }
  return json.data as T;
}

// ---- Types ----
export type Role = "admin" | "teacher" | "parent" | "student";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenant_id: string;
}
export interface Subject {
  id: string;
  name: string;
  color: string;
}
export interface Student {
  id: string;
  name: string;
  grade_level: string;
  parent_user_id?: string;
}

export type MaterialStatus = "processing" | "ready" | "failed";
export type ExamStatus = "draft" | "needs_review" | "published";

export interface MaterialRow {
  id: string;
  title: string;
  subject: string;
  status: MaterialStatus;
  created_at: string;
  exam_id: string;
  exam_status: string;
}
export interface Material {
  id: string;
  subject_id: string;
  title: string;
  status: MaterialStatus;
  source_filename: string;
  summary: string;
  created_at: string;
}
export interface Question {
  id: string;
  subject_id: string;
  topic: string;
  difficulty: string;
  stem: string;
  options: string[];
  answer?: string;
  explanation?: string;
  confidence?: number;
  needs_review?: boolean;
  approved?: boolean;
}
export interface ExamRow {
  id: string;
  title: string;
  subject: string;
  status: ExamStatus;
  question_count: number;
  flagged: number;
  created_at: string;
}
export interface Exam {
  id: string;
  subject_id?: string;
  material_id?: string;
  title: string;
  status: ExamStatus;
  question_count: number;
  created_at: string;
  published_at?: string;
}
export interface PublishedExam {
  id: string;
  title: string;
  subject: string;
  subject_id: string;
  question_count: number;
}

export interface ClassStats {
  students: number;
  exams_taken: number;
  pending_review: number;
  average_percent: number;
  score_buckets: { label: string; count: number }[];
  subject_averages: { subject: string; color: string; average: number }[];
}
export interface StudentProgress {
  student_id: string;
  student_name: string;
  grade_level: string;
  overall_average: number;
  timeline: { id: string; title: string; subject: string; percent: number; status: string; date: string }[];
  subject_averages: { subject: string; color: string; average: number }[];
}
export interface StudentReportInfo {
  student_id: string;
  period_end: string;
  overall_average: number;
  homeworks_done: number;
  top_subject: string;
  narrative: string;
  generated_at: string;
}
export interface AdminStudentRow {
  student_id: string;
  name: string;
  grade_level: string;
  average: number;
  exams_taken: number;
  last_activity: string;
}
export interface AdminOverview {
  students: number;
  teachers: number;
  parents: number;
  exams_taken: number;
  average_percent: number;
  pending_review: number;
  reports_generated: number;
  score_buckets: { label: string; count: number }[];
  subject_averages: { subject: string; color: string; average: number }[];
  students_rows: AdminStudentRow[];
}
export interface AutomationEvent {
  kind: "report" | "alert";
  student_name: string;
  message: string;
  value: number;
  created_at: string;
}
export interface AdminAutomation {
  enabled: boolean;
  interval: string;
  last_run: string;
  reports_generated: number;
  flags: number;
  vision_reader: string;
  tutor_provider: string;
  events: AutomationEvent[];
}

// ---- Endpoints ----
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),

  subjects: () => request<Subject[]>("/subjects"),
  students: () => request<Student[]>("/students"),
  studentProgress: (id: string) => request<StudentProgress>(`/students/${id}/progress`),
  latestReport: (id: string) => request<StudentReportInfo>(`/reports/student/${id}`),

  // Teacher — teaching material + generated exams.
  uploadMaterial: (form: FormData) =>
    request<{ id: string; status: string }>("/materials", { method: "POST", body: form }),
  materialStatus: (id: string) => request<{ id: string; status: MaterialStatus }>(`/materials/${id}/status`),
  materials: () => request<MaterialRow[]>("/materials"),
  material: (id: string) => request<Material>(`/materials/${id}`),
  exams: (status?: string) => request<ExamRow[]>(`/exams${status ? `?status=${status}` : ""}`),
  exam: (id: string) => request<{ exam: Exam; questions: Question[] }>(`/exams/${id}`),
  publishExam: (id: string) => request<{ status: string }>(`/exams/${id}/publish`, { method: "POST" }),
  discardExamQuestion: (examId: string, qid: string) =>
    request<{ status: string }>(`/exams/${examId}/questions/${qid}/discard`, { method: "POST" }),

  classStats: () => request<ClassStats>("/dashboard/class"),
  adminOverview: () => request<AdminOverview>("/admin/overview"),
  adminAutomation: () => request<AdminAutomation>("/admin/automation"),
  runAutomation: () => request<{ reports: number }>("/admin/automation/run", { method: "POST" }),

  // Student — take a published exam + tutor.
  publishedExams: () => request<PublishedExam[]>("/exams/published"),
  startExam: (examId: string, student_id: string) =>
    request<{ practice_set_id: string; questions: Question[] }>(`/exams/${examId}/start`, {
      method: "POST",
      body: JSON.stringify({ student_id }),
    }),
  submitPractice: (setId: string, answers: Record<string, string>) =>
    request<{ score: number; max_score: number; percent: number; details: any[] }>(
      `/practice/${setId}/submit`,
      { method: "POST", body: JSON.stringify({ answers }) },
    ),
  explain: (questionId: string) => request<{ explanation: string }>(`/questions/${questionId}/explain`),
  tutorChat: (student_id: string, subject_id: string, message: string) =>
    request<{ answer: string }>("/tutor/chat", {
      method: "POST",
      body: JSON.stringify({ student_id, subject_id, message }),
    }),
};
