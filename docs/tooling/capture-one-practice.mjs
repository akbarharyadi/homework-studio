// Targeted re-capture of the student practice set in isolation, so GLM has no
// competing calls and finishes quickly. Saves 08-student-practice-set.png.
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "http://localhost:3000";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "manual", "img");

const token = (
  await (
    await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@demo.id", password: "demo1234" }),
    })
  ).json()
).data.token;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate((t) => localStorage.setItem("hs_token", t), token);
await page.goto(`${BASE}/student`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1000));

const clickText = (sel, txt) =>
  page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((e) =>
        e.textContent.trim().toLowerCase().includes(t.toLowerCase()),
      );
      if (el) { el.click(); return true; }
      return false;
    },
    sel,
    txt,
  );

await clickText("button", "Start practice");
await page.waitForFunction(() => document.body.innerText.includes("Show me how"), { timeout: 120000 });
await clickText("button", "Show me how");
await page.waitForFunction(() => document.body.innerText.includes("Hide explanation"), { timeout: 30000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: join(OUT, "08-student-practice-set.png"), fullPage: true });
console.log("saved 08-student-practice-set.png");
await browser.close();
