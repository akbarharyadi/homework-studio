// Capture UI screenshots for the user manual (material → exam + gamified student).
//
// Logs in as each demo role via the API, injects the JWT into localStorage, then
// visits each screen and saves a full-page PNG to docs/manual/img/.
//
//   node capture-screenshots.mjs   (needs the app running on :3000)
import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.APP_BASE || "http://localhost:3000";
const PASSWORD = "demo1234";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "manual", "img");
const VIEWPORT = { width: 1280, height: 860, deviceScaleFactor: 2 };

async function login(email) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status}`);
  return (await res.json()).data.token;
}
async function apiGet(path, token) {
  const res = await fetch(`${BASE}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()).data;
}
async function apiPost(path, token, body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return (await res.json()).data;
}
const settle = (ms = 1400) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const shot = async (name, { full = true } = {}) => {
    await settle();
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
    console.log("saved", `${name}.png`);
  };
  const authAndGo = async (token, path) => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate((t) => localStorage.setItem("hs_token", t), token);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  };
  const clickText = (sel, txt) =>
    page.evaluate((s, t) => {
      const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase()));
      if (el) { el.click(); return true; }
      return false;
    }, sel, txt);

  try {
    // ---- Login ----
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    try { await page.evaluate(() => localStorage.removeItem("hs_token")); } catch {}
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await shot("01-login", { full: false });

    // ---- Teacher ----
    const teacher = await login("teacher@demo.id");
    await authAndGo(teacher, "/teacher");
    await shot("02-teacher-dashboard");
    await authAndGo(teacher, "/teacher/materials");
    await shot("03-teacher-materials");
    const exams = await apiGet("/exams", teacher);
    const draft = exams.find((e) => e.status === "needs_review") || exams[0];
    await authAndGo(teacher, `/teacher/exams/${draft.id}`);
    await shot("04-teacher-exam-review");

    // ---- Parent ----
    const parent = await login("parent@demo.id");
    await authAndGo(parent, "/parent");
    // Wait for the AI "How to help" tip to load (GLM) before capturing.
    await page.waitForFunction(() => document.body.innerText.includes("How to help"), { timeout: 30000 }).catch(() => {});
    await shot("05-parent-progress");
    const kids = await apiGet("/students", parent);
    if (kids?.length) {
      await authAndGo(parent, `/parent/report/${kids[0].id}`);
      await shot("06-parent-report");
    }

    // ---- Student ----
    const student = await login("student@demo.id");
    const students = await apiGet("/students", student);
    const sid = students[0].id;

    // Create a reviewable attempt via the API (mix of right/wrong), for the review shot.
    const pub = await apiGet("/exams/published", student);
    const started = await apiPost(`/exams/${pub[0].id}/start`, student, { student_id: sid });
    const ans = {};
    started.questions.forEach((q, i) => { ans[q.id] = q.options[i % 2 === 0 ? 0 : Math.min(1, q.options.length - 1)]; });
    await apiPost(`/practice/${started.practice_set_id}/submit`, student, { answers: ans });

    await authAndGo(student, "/student");
    await shot("07-student-home");

    // Take an exam and open an explanation.
    await authAndGo(student, "/student/exams");
    if (await clickText("button", "Start exam")) {
      await page.waitForFunction(() => document.body.innerText.includes("Show me how"), { timeout: 30000 }).catch(() => {});
      await clickText("button", "Show me how");
      await page.waitForFunction(() => document.body.innerText.includes("Hide explanation"), { timeout: 8000 }).catch(() => {});
      await shot("08-student-exam");
    }

    // Practice / drill.
    await authAndGo(student, "/student/practice");
    if (await clickText("button", "Start practice")) {
      await page.waitForFunction(() => document.body.innerText.includes("Show me how"), { timeout: 20000 }).catch(() => {});
      await shot("09-student-practice");
    }

    // Review the attempt created above.
    await authAndGo(student, `/student/results/${started.practice_set_id}`);
    await shot("10-student-review");

    await authAndGo(student, "/student/tutor");
    await shot("11-student-tutor", { full: false });

    // ---- Admin ----
    const admin = await login("admin@demo.id");
    await authAndGo(admin, "/admin");
    await shot("12-admin-overview");
    await authAndGo(admin, "/admin/insights");
    await settle(2200); // let the trend chart finish its animation
    await shot("13-admin-insights");
    await authAndGo(admin, "/admin/automation");
    await shot("14-admin-automation");

    console.log("\nAll screenshots in", OUT);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
