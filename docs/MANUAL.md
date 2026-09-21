# Homework Studio — User Manual

**A step-by-step guide to the four roles: Teacher, Parent, Student, and Admin.**

> Independent portfolio demo. All students and data are synthetic. This manual walks
> through what each person does, with screenshots of the live app.

---

## Getting started

Open the app and you land on the sign-in screen. Instead of typing a password, you
pick a **role** to explore the demo — one tap signs you in as a sample user.

![Sign in — pick a role](manual/img/01-login.png)

**Demo accounts** — every account uses the password `demo1234`:

| Role | Email | Lands on |
|---|---|---|
| 🧑‍🏫 Teacher | `teacher@demo.id` | Class dashboard |
| 👪 Parent | `parent@demo.id` | Your children's progress |
| 🧒 Student | `student@demo.id` | Your learning home (XP, streak, badges) |
| 🏫 Admin | `admin@demo.id` | School overview |

Switch roles anytime with **Switch role** in the top-right corner.

---

## What you can upload — and what the AI makes from it

The teacher uploads **teaching material** (a syllabus or lesson). Nothing else in the
app requires an upload.

**Accepted formats:**

| Type | Extensions | Read by |
|---|---|---|
| Document | `.pdf` | The vision model (the first page is rasterized and transcribed) |
| Image | `.png`, `.jpg`, `.jpeg` | The vision model (transcribed to text) |
| Text | `.txt`, `.md` | Read directly |

- **One file per upload**, up to **25 MB**.
- `.docx` is not supported yet — export to PDF or paste into a `.txt`/`.md` first.
- On the free demo (no AI key), plain-text `.txt`/`.md` works best, since reading a
  PDF or photo needs the vision model.

**From one material, the AI produces three things:**

1. **A custom exam** — multiple-choice questions grounded in your material, that
   students take and get auto-graded.
2. **Teaching notes** — a short lesson summary (key points + a worked example).
3. **Tutor knowledge** — the material is indexed so the student tutor answers from
   *your* class's content.

---

## 🧑‍🏫 Teacher

**What you do:** upload material, let the AI turn it into an exam, review the
questions, and publish. Then watch how the class does.

### The dashboard

You land on the class at a glance: how many students, how many exams have been taken,
the class average, and how many AI questions are **awaiting your review**. Below are
the four-step flow, the score distribution, the per-subject averages, and your recent
materials.

![Teacher dashboard](manual/img/02-teacher-dashboard.png)

### Step by step: material → a published exam

**1. Open Materials → choose a subject and (optionally) a title.**
**2. Drop your file** onto the box, or click to browse. The accepted formats and the
25 MB limit are shown right under the drop zone.

![Upload teaching material](manual/img/03-teacher-materials.png)

**3. Press "Upload & generate".** The material now moves through the pipeline. You'll
see its status change:

| Status | What it means |
|---|---|
| **Processing…** | The AI is reading the material, writing notes, and generating the exam. Usually a few seconds (longer for a PDF/photo). |
| **Ready** ✅ | Done — teaching notes were written and an exam was generated. A **View exam →** link appears. |
| **Failed** | The file couldn't be read (corrupt file, or an image/PDF with no AI key). Try a `.txt`/`.md`, or check the file. |

**4. Review the generated exam.** Open the exam (from **View exam →** or the **Exams**
tab). Every question shows the AI's **confidence**. The ones the model was *least*
sure about are **flagged for review** (amber) — that's the human-in-the-loop gate:
nothing reaches students until you approve it.

![Review the AI-generated exam](manual/img/04-teacher-exam-review.png)

For each question you can:
- **Keep it** — the correct answer is highlighted in green; a confidence badge shows
  how sure the AI was.
- **Discard this question** — drops a question that's wrong or off-topic.

**5. Press "Approve & publish".** The exam's status becomes **Published** and it
appears for students. That's it — the material is now an assessment.

**What "success" looks like:** the material reads **Ready**, the exam has sensible
questions (flagged ones checked), and after publishing its badge is **Published**.
**What "needs a look" looks like:** an exam badge of **Needs review** with a flagged
count — one or more questions the AI wasn't confident about, waiting for you.

**Exam states:**

| Exam status | Meaning |
|---|---|
| **Draft** | Generated; every question cleared the confidence bar. Publish when ready. |
| **Needs review** | One or more questions are flagged — check them before publishing. |
| **Published** | Live for students. |

---

## 🧒 Student

**What you do:** take exams, practise, learn from your mistakes, and level up.

### 1. Your learning home

**Home** is a gamified overview: your **level ring** and **XP**, a **day streak**, and
quick chips (average, best score). It shows your **badges** (earned + still-locked with
a hint), your **subject mastery**, your **recent results**, and the **class
leaderboard**. Earn XP by taking exams and practising.

If you're finding a subject hard, a **🎯 Recommended for you** card appears: the
automation has built you a short practice set in your weakest subject. Tap **Start now**
to go straight into it (it earns XP, and isn't counted in your grades).

![Student home — XP, streak, badges, leaderboard](manual/img/07-student-home.png)

### 2. Take an exam

**Exams** lists every exam your teacher published. Pick one, press **Start exam**,
answer each question, then **Submit** for an instant score. Tap **💡 Show me how**
anytime for a step-by-step explanation (math renders properly).

![Taking an exam](manual/img/08-student-exam.png)

### 3. Practise (drill mode)

**Practice** lets you drill from the question bank by **subject** and **level** —
untimed and low-stakes. It **earns XP and keeps your streak**, but is **not counted in
your grades**, so you can learn without pressure.

![Practice / drill mode](manual/img/09-student-practice.png)

### 4. Review your results

From **Home → See all** (or a recent result), open any past attempt to see **every
question, your answer vs the correct one, and the explanation** — so you learn from
what you missed.

![Reviewing a past attempt](manual/img/10-student-review.png)

### 5. Ask the tutor

Open **Tutor** to chat. It's patient, explains step by step, and answers from **your
class's material** (the teacher's uploads), not the whole internet.

![Ask the tutor](manual/img/11-student-tutor.png)

---

## 👪 Parent

**What you do:** see how each child is doing — grades *and* effort — get a tip on how
to help, and open a printable report.

### 1. Your children

**My children** opens on a card per child showing not just grades but **engagement**:
the overall average, a **day streak**, their **level**, and **badges earned** — with a
**"needs a look"** flag for anyone dipping below 65%. Tap a card to see that child in
detail. Below the cards you get:

- **💡 How to help** — a short, warm suggestion (AI-generated) built from your child's
  strongest subject and the area to grow.
- **This week's report** — written **automatically** by the system, no one pressing a
  button.
- **Progress over time** and **Compared to the class** (your child vs the class
  average per subject, with a marker for the class).
- **What's new** — a feed of reports, badges earned, new exams, and any at-risk alerts.
- The full **exam history**.

![Parent family dashboard](manual/img/05-parent-progress.png)

### 2. The printable report

Press **Progress report** for a clean, one-page report — a warm summary, headline
numbers, strength by subject, and the full exam history. Use your browser's **Save as
PDF** (the 🖨️ button) to keep or share it.

![Printable progress report](manual/img/06-parent-report.png)

---

## 🏫 Admin

**What you do:** monitor the whole school and watch the automation work.

### 1. School overview

**Overview** is the school at a glance: totals, the class average, and **mastery
bands** (mastered / on track / needs support). The **Needs attention** panel surfaces
students below 65% first. Below are top performers, strength by subject, the score
distribution, and the full roster — each with a plain-language note.

![Admin — school overview](manual/img/12-admin-overview.png)

### 2. Insights

**Insights** goes beyond grades. **Engagement** shows how much the school is actually
doing — students active today, average streak, total XP, badges earned, and the
**streak leaders**. **Trend (last 14 days)** charts the school average and daily
activity. **Teaching & exams** is the content pipeline — materials in, AI-generated
exams out — with **per-exam performance** (takers, average, and the **hardest
question**).

![Admin — insights](manual/img/13-admin-insights.png)

### 3. Automation

**Automation** is a **jobs dashboard** — every job the platform runs on its own, with
its trigger, schedule and how many times it has fired:

- **Material → exam** — reads an uploaded file into an exam (on upload).
- **Auto-publish clean exams** — an exam with no flagged question publishes itself, so
  the teacher only reviews the flagged ones (on generate).
- **Progress reports** — each child's attempts → a warm report (every 6h).
- **At-risk flagging** — students under 65% are surfaced for support (every 6h).
- **Auto-remediation** — each flagged student gets a targeted practice set in their
  weakest subject, which they see as "Recommended for you" (every 6h).

It also shows the **AI models** doing the work and a colour-coded **live activity
feed** of what just happened. Press **▶ Run scheduled jobs now** to trigger a run.

![Admin — automation](manual/img/14-admin-automation.png)

> Admins can also open the teacher's **Materials** and **Exams** tools from the nav.

---

## Documents the system produces

Besides the exam, two other documents come out of one upload:

- **Teaching notes** — a lesson summary (key points + a worked example) generated from
  your material, shown on the material.
- **The parent progress report** — a one-page, printable report per child (Save as PDF
  from the browser), refreshed automatically each week by the background scheduler.

---

## Frequently asked

**Do I need an API key to try it?** No. Everything runs on a free, built-in demo mode
by default. Real AI models (reading PDFs/photos, richer exam generation, the tutor)
turn on with a key.

**What can I upload, and how big?** One file per material: **PDF, PNG, JPG, TXT, or
MD**, up to **25 MB**. (`.docx` isn't supported yet.)

**Who grades the exams?** They're **auto-graded** the moment a student submits. The
teacher's review is on the *questions* (before publishing), not on each student's
answers.

**It works on my phone?** Yes — responsive to phone width, and installable (Add to
Home Screen) as an app with an offline shell.

---

*See [`TECHNICAL.md`](TECHNICAL.md) for the architecture, data flow, and database
design behind these screens.*
