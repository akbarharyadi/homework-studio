// Capture UI screenshots for the user manual.
//
// Logs in as each demo role via the API, injects the JWT into localStorage, then
// visits each page and saves a full-page PNG to docs/manual/img/.
//
// Requires the app running: docker compose --profile full up -d  (frontend :3000).
//
//   node capture-screenshots.mjs
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
  const json = await res.json();
  return json.data.token;
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()).data;
}

async function settle(page, ms = 1400) {
  // let fonts, charts and any lazy content paint
  await new Promise((r) => setTimeout(r, ms));
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) =>
        e.textContent.trim().toLowerCase().includes(txt.toLowerCase()),
      );
      if (el) { el.click(); return true; }
      return false;
    },
    selector,
    text,
  );
  return clicked;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const shot = async (name, { full = true } = {}) => {
    await settle(page);
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
    console.log("saved", `${name}.png`);
  };

  const authAndGo = async (token, path) => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate((t) => localStorage.setItem("hs_token", t), token);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  };

  try {
    // ---- Login (unauthenticated) ----
    await page.evaluate?.(() => {}).catch(() => {});
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" }).catch(() => {});
    try { await page.evaluate(() => localStorage.removeItem("hs_token")); } catch {}
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await shot("01-login", { full: false });

    // ---- Teacher ----
    const teacher = await login("teacher@demo.id");
    await authAndGo(teacher, "/teacher");
    await shot("02-teacher-dashboard");
    await authAndGo(teacher, "/teacher/upload");
    await shot("03-teacher-upload");
    await authAndGo(teacher, "/teacher/review");
    await shot("04-teacher-review");

    // ---- Parent ----
    const parent = await login("parent@demo.id");
    await authAndGo(parent, "/parent");
    await shot("05-parent-progress");
    try {
      const kids = await apiGet("/students", parent);
      if (kids?.length) {
        await authAndGo(parent, `/parent/report/${kids[0].id}`);
        await shot("06-parent-report");
      }
    } catch (e) { console.warn("parent report skipped:", e.message); }

    // ---- Student ----
    const student = await login("student@demo.id");
    await authAndGo(student, "/student");
    await shot("07-student-practice");
    // Generate a set, wait for the questions to render, then open an explanation.
    if (await clickByText(page, "button", "Start practice")) {
      await page
        .waitForFunction(() => document.body.innerText.includes("Show me how"), { timeout: 90000 })
        .catch(() => {});
      await clickByText(page, "button", "Show me how");
      await page
        .waitForFunction(() => document.body.innerText.includes("Hide explanation"), { timeout: 10000 })
        .catch(() => {});
      await shot("08-student-practice-set");
    }
    await authAndGo(student, "/student/tutor");
    await shot("09-student-tutor", { full: false });

    // ---- Admin ----
    const admin = await login("admin@demo.id");
    await authAndGo(admin, "/admin");
    await shot("10-admin-overview");
    await authAndGo(admin, "/admin/automation");
    await shot("11-admin-automation");

    console.log("\nAll screenshots in", OUT);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
