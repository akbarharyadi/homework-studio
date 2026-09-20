// Upload one sample homework as the teacher so the manual can show the confidence
// gate in action: the mock reader always flags question 3 (low confidence), which
// opens a review task. Idempotent enough for docs — safe to run once before capture.
//
//   node seed-demo-homework.mjs
const BASE = process.env.APP_BASE || "http://localhost:3000";
const PASSWORD = "demo1234";

// Minimal valid 1x1 PNG (content is irrelevant to the mock reader).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function login(email) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return (await r.json()).data.token;
}

async function main() {
  const token = await login("teacher@demo.id");
  const students = await (
    await fetch(`${BASE}/api/v1/students`, { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  const student = students.data[0];

  // Skip if there is already an open review task (keeps re-runs clean).
  const tasks = await (
    await fetch(`${BASE}/api/v1/review/tasks?status=open`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  if ((tasks.data || []).length > 0) {
    console.log("open review task already exists — nothing to upload");
    return;
  }

  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), "math-worksheet.png");
  form.append("student_id", student.id);
  form.append("title", "Math Worksheet — Addition");

  const up = await fetch(`${BASE}/api/v1/homeworks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!up.ok) throw new Error(`upload: ${up.status} ${await up.text()}`);
  const { id } = (await up.json()).data;

  // Poll until the pipeline settles.
  for (let i = 0; i < 40; i++) {
    const st = await (
      await fetch(`${BASE}/api/v1/homeworks/${id}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
    if (["needs_review", "graded", "failed"].includes(st.data.status)) {
      console.log(`uploaded '${student.name}' homework → ${st.data.status}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log("uploaded; still processing after timeout");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
