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
export interface Homework {
  id: string;
  student_id: string;
  subject_id?: string;
  title: string;
  status: "pending" | "processing" | "needs_review" | "graded" | "failed";
  detected_subject: string;
  score: number;
  max_score: number;
  percent: number;
  confidence: number;
  created_at: string;
}
export interface HomeworkItem {
  id: string;
  question_no: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct?: boolean;
  marks: number;
  max_marks: number;
  confidence: number;
  needs_review: boolean;
}
export interface ReviewTask {
  id: string;
  homework_id: string;
  item_id?: string;
  field_name: string;
  reason: string;
  status: string;
  student_name: string;
  homework_title: string;
  question_no: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  confidence: number;
}
export interface ClassStats {
  students: number;
  homeworks_graded: number;
  needs_review: number;
  average_percent: number;
  score_buckets: { label: string; count: number }[];
  subject_averages: { subject: string; color: string; average: number }[];
}
export interface StudentProgress {
  student_id: string;
  student_name: string;
  grade_level: string;
  overall_average: number;
  timeline: { homework_id: string; title: string; subject: string; percent: number; status: string; date: string }[];
  subject_averages: { subject: string; color: string; average: number }[];
}
export interface Question {
  id: string;
  subject_id: string;
  topic: string;
  difficulty: string;
  stem: string;
  options: string[];
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

  homeworks: (params?: { student_id?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Homework[]>(`/homeworks${q ? `?${q}` : ""}`);
  },
  homework: (id: string) => request<{ homework: Homework; items: HomeworkItem[] }>(`/homeworks/${id}`),
  homeworkStatus: (id: string) =>
    request<{ id: string; status: string; percent: number; confidence: number }>(`/homeworks/${id}/status`),
  uploadHomework: (form: FormData) =>
    request<{ id: string; status: string }>("/homeworks", { method: "POST", body: form }),

  reviewTasks: (status = "open") => request<ReviewTask[]>(`/review/tasks?status=${status}`),
  resolveReview: (id: string, corrected_answer: string, is_correct: boolean) =>
    request<{ homework: Homework }>(`/review/tasks/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ corrected_answer, is_correct }),
    }),

  classStats: () => request<ClassStats>("/dashboard/class"),

  explain: (questionId: string) =>
    request<{ explanation: string }>(`/questions/${questionId}/explain`),
  generatePractice: (student_id: string, subject_id: string, count = 5) =>
    request<{ practice_set_id: string; questions: Question[] }>("/practice/generate", {
      method: "POST",
      body: JSON.stringify({ student_id, subject_id, count }),
    }),
  submitPractice: (setId: string, answers: Record<string, string>) =>
    request<{ score: number; max_score: number; percent: number; details: any[] }>(
      `/practice/${setId}/submit`,
      { method: "POST", body: JSON.stringify({ answers }) },
    ),
  tutorChat: (student_id: string, subject_id: string, message: string) =>
    request<{ answer: string }>("/tutor/chat", {
      method: "POST",
      body: JSON.stringify({ student_id, subject_id, message }),
    }),
};
