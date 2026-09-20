// Command seed loads a deterministic demo dataset: one school, four logins
// (teacher/parent/student/admin), two subjects, a handful of students, a small
// practice-question bank, and some RAG material. Re-running resets the demo.
package main

import (
	"context"
	"log"

	"homework-studio/internal/auth"
	"homework-studio/internal/config"
	"homework-studio/internal/db"
	"homework-studio/internal/domain"
	"homework-studio/internal/store"
)

const (
	pass = "demo1234"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	st := store.New(pool)

	// Reset any previous demo tenant (cascades to all its data).
	_, _ = pool.Exec(ctx, `DELETE FROM tenants WHERE slug='demo'`)

	// --- Tenant ---
	tenant := &domain.Tenant{Name: "Ottolab Demo School", Slug: "demo"}
	must(st.CreateTenant(ctx, tenant))

	// --- Users ---
	hash, _ := auth.HashPassword(pass)
	teacher := &domain.User{TenantID: tenant.ID, Email: "teacher@demo.id", PasswordHash: hash, Name: "Ms. Rida", Role: domain.RoleTeacher}
	parent := &domain.User{TenantID: tenant.ID, Email: "parent@demo.id", PasswordHash: hash, Name: "Bu Sari (Parent)", Role: domain.RoleParent}
	studentUser := &domain.User{TenantID: tenant.ID, Email: "student@demo.id", PasswordHash: hash, Name: "Aisha", Role: domain.RoleStudent}
	admin := &domain.User{TenantID: tenant.ID, Email: "admin@demo.id", PasswordHash: hash, Name: "Admin", Role: domain.RoleAdmin}
	for _, u := range []*domain.User{teacher, parent, studentUser, admin} {
		must(st.CreateUser(ctx, u))
	}

	// --- Subjects ---
	math := &domain.Subject{TenantID: tenant.ID, Name: "Math", Color: "#6366f1"}
	science := &domain.Subject{TenantID: tenant.ID, Name: "Science", Color: "#10b981"}
	must(st.CreateSubject(ctx, math))
	must(st.CreateSubject(ctx, science))

	// --- Students (Aisha + Rizky are linked to the parent login) ---
	aisha := &domain.Student{TenantID: tenant.ID, Name: "Aisha Putri", GradeLevel: "Grade 4", ParentUserID: &parent.ID}
	rizky := &domain.Student{TenantID: tenant.ID, Name: "Rizky Putra", GradeLevel: "Grade 2", ParentUserID: &parent.ID}
	students := []*domain.Student{
		aisha,
		{TenantID: tenant.ID, Name: "Budi Santoso", GradeLevel: "Grade 4"},
		{TenantID: tenant.ID, Name: "Chandra Wijaya", GradeLevel: "Grade 4"},
		{TenantID: tenant.ID, Name: "Dewi Lestari", GradeLevel: "Grade 5"},
		{TenantID: tenant.ID, Name: "Eka Pratama", GradeLevel: "Grade 5"},
		rizky, // index 5 — the parent's second child
	}
	for _, s := range students {
		must(st.CreateStudent(ctx, s))
	}

	// --- Question bank ---
	seedMathQuestions(ctx, st, tenant.ID, math.ID)
	seedScienceQuestions(ctx, st, tenant.ID, science.ID)

	// --- RAG material (tutor knowledge) ---
	seedMaterial(ctx, st, tenant.ID, science.ID, "Science Basics", scienceFacts)
	seedMaterial(ctx, st, tenant.ID, math.ID, "Math Basics", mathFacts)

	// --- Published exams (so students have something to take immediately) ---
	mathExam := seedPublishedExam(ctx, st, tenant.ID, math.ID, "Math Basics — Quiz", []examQ{
		{"7 + 8 = ?", []string{"13", "14", "15", "16"}, "15", domain.DiffEasy, "Add the ones: $7+8=15$."},
		{"12 + 9 = ?", []string{"20", "21", "22", "23"}, "21", domain.DiffEasy, "$12+9=21$."},
		{"6 × 4 = ?", []string{"20", "22", "24", "28"}, "24", domain.DiffMedium, "$6\\times4=24$."},
		{"36 ÷ 6 = ?", []string{"5", "6", "7", "8"}, "6", domain.DiffMedium, "$36\\div6=6$."},
		{"What is 1/2 of 18?", []string{"6", "8", "9", "12"}, "9", domain.DiffMedium, "Half of 18 is $9$."},
	})
	sciExam := seedPublishedExam(ctx, st, tenant.ID, science.ID, "Science Basics — Quiz", []examQ{
		{"Which gas do plants absorb during photosynthesis?", []string{"Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"}, "Carbon dioxide", domain.DiffEasy, "Plants take in carbon dioxide."},
		{"What is the closest planet to the Sun?", []string{"Venus", "Mercury", "Earth", "Mars"}, "Mercury", domain.DiffEasy, "Mercury is first from the Sun."},
		{"What organ pumps blood around the body?", []string{"Lungs", "Brain", "Heart", "Liver"}, "Heart", domain.DiffEasy, "The heart pumps blood."},
		{"How many legs does an insect have?", []string{"4", "6", "8", "10"}, "6", domain.DiffMedium, "Insects have six legs."},
		{"What force pulls objects toward Earth?", []string{"Friction", "Magnetism", "Gravity", "Tension"}, "Gravity", domain.DiffMedium, "Gravity pulls objects down."},
	})

	// --- A teacher-uploaded material + a draft exam awaiting review (shows the gate) ---
	seedMaterialWithDraftExam(ctx, st, tenant.ID, teacher.ID, math.ID, "Fractions for Grade 4")

	// --- Finished attempts spread over the last 5 days, so progress / streaks / the
	//     leaderboard show real data on a fresh seed (alternating math/science). ---
	profiles := map[string][]float64{
		aisha.ID:       {90, 80, 100, 90, 100},
		students[1].ID: {55, 60, 60, 65, 60}, // Budi
		students[2].ID: {70, 65, 60, 70, 65}, // Chandra
		students[3].ID: {50, 55, 60, 50, 55}, // Dewi
		students[4].ID: {60, 65, 70, 60, 65}, // Eka
		rizky.ID:       {55, 45, 60},         // Rizky (Grade 2) — needs a little support
	}
	for sid, scs := range profiles {
		for i, pct := range scs {
			daysAgo := len(scs) - 1 - i // oldest first, newest today → a 5-day streak
			subj, exam := math.ID, mathExam
			if i%2 == 1 {
				subj, exam = science.ID, sciExam
			}
			seedAttempt(ctx, st, tenant.ID, sid, subj, exam, pct, daysAgo)
		}
	}
	// A couple of ungraded practice attempts for Aisha (earn XP, not counted in grades).
	seedPractice(ctx, st, tenant.ID, aisha.ID, math.ID, 80, 1)
	seedPractice(ctx, st, tenant.ID, aisha.ID, science.ID, 100, 0)

	log.Printf("✅ demo seeded.\n  School: %s\n  Logins (password %q):\n    teacher@demo.id\n    parent@demo.id\n    student@demo.id\n    admin@demo.id\n  Subjects: Math, Science. Students: %d. Bank + material + 2 published exams + attempts loaded.",
		tenant.Name, pass, len(students))
	log.Printf("  IDs → tenant=%s math=%s science=%s aisha=%s", tenant.ID, math.ID, science.ID, aisha.ID)
}

func seedMathQuestions(ctx context.Context, st *store.Store, tenantID, subjectID string) {
	qs := []struct {
		stem, ans, expl, diff string
		opts                  []string
	}{
		{"7 + 8 = ?", "15", "Add the ones: $7+8=15$.", domain.DiffEasy, []string{"13", "14", "15", "16"}},
		{"12 + 9 = ?", "21", "$12+9=21$. Add tens then ones.", domain.DiffEasy, []string{"20", "21", "22", "23"}},
		{"6 × 4 = ?", "24", "Multiply: $6\\times4=24$.", domain.DiffMedium, []string{"20", "22", "24", "28"}},
		{"36 ÷ 6 = ?", "6", "$36\\div6=6$ because $6\\times6=36$.", domain.DiffMedium, []string{"5", "6", "7", "8"}},
		{"What is 1/2 of 18?", "9", "Half of 18 is $18\\div2=9$.", domain.DiffMedium, []string{"6", "8", "9", "12"}},
		{"25 + 47 = ?", "72", "$25+47=72$.", domain.DiffHard, []string{"62", "70", "72", "74"}},
		{"9 × 7 = ?", "63", "$9\\times7=63$.", domain.DiffHard, []string{"56", "63", "72", "81"}},
	}
	for _, q := range qs {
		must(st.CreateQuestion(ctx, &domain.Question{
			TenantID: tenantID, SubjectID: subjectID, Topic: "Arithmetic", Difficulty: q.diff,
			Stem: q.stem, Options: q.opts, Answer: q.ans, Explanation: q.expl, Marks: 1, NegativeMarks: 0,
		}))
	}
}

func seedScienceQuestions(ctx context.Context, st *store.Store, tenantID, subjectID string) {
	qs := []struct {
		stem, ans, expl, diff string
		opts                  []string
	}{
		{"Which gas do plants absorb during photosynthesis?", "Carbon dioxide", "Plants take in carbon dioxide and release oxygen.", domain.DiffEasy, []string{"Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"}},
		{"What is the closest planet to the Sun?", "Mercury", "Mercury is the first planet from the Sun.", domain.DiffEasy, []string{"Venus", "Mercury", "Earth", "Mars"}},
		{"What organ pumps blood around the body?", "Heart", "The heart pumps blood through the body.", domain.DiffEasy, []string{"Lungs", "Brain", "Heart", "Liver"}},
		{"Water freezes into a solid at what temperature (°C)?", "0", "Water freezes at $0^\\circ$C.", domain.DiffMedium, []string{"0", "10", "50", "100"}},
		{"How many legs does an insect have?", "6", "Insects have six legs.", domain.DiffMedium, []string{"4", "6", "8", "10"}},
		{"What force pulls objects toward Earth?", "Gravity", "Gravity pulls objects toward Earth.", domain.DiffMedium, []string{"Friction", "Magnetism", "Gravity", "Tension"}},
		{"Which part of a plant makes food?", "Leaf", "Leaves make food through photosynthesis.", domain.DiffHard, []string{"Root", "Stem", "Leaf", "Flower"}},
	}
	for _, q := range qs {
		must(st.CreateQuestion(ctx, &domain.Question{
			TenantID: tenantID, SubjectID: subjectID, Topic: "General Science", Difficulty: q.diff,
			Stem: q.stem, Options: q.opts, Answer: q.ans, Explanation: q.expl, Marks: 1, NegativeMarks: 0,
		}))
	}
}

var scienceFacts = []string{
	"Photosynthesis is how plants make food using sunlight, water, and carbon dioxide, releasing oxygen.",
	"The heart is a muscle that pumps blood through the body, delivering oxygen and nutrients.",
	"Gravity is the force that pulls objects toward the Earth; it is why things fall down.",
	"The Sun is a star at the center of our solar system; Mercury is the closest planet to it.",
	"Water can be a solid (ice), a liquid, or a gas (steam) depending on temperature.",
}

var mathFacts = []string{
	"Addition combines numbers to make a bigger total; 7 + 8 = 15.",
	"Multiplication is repeated addition; 6 × 4 means 6 added four times, which is 24.",
	"Division splits a number into equal groups; 36 ÷ 6 = 6.",
	"A fraction like 1/2 means one of two equal parts; one half of 18 is 9.",
}

func seedMaterial(ctx context.Context, st *store.Store, tenantID, subjectID, title string, facts []string) {
	matID, err := st.CreateMaterial(ctx, tenantID, subjectID, title, "seed")
	must(err)
	for i, f := range facts {
		must(st.CreateChunk(ctx, matID, f, nil, i+1))
	}
}

// examQ is a compact seed question definition.
type examQ struct {
	stem string
	opts []string
	ans  string
	diff string
	expl string
}

// seedPublishedExam creates an exam (published) with approved questions and returns its id.
func seedPublishedExam(ctx context.Context, st *store.Store, tenantID, subjectID, title string, qs []examQ) string {
	sid := subjectID
	exam := &domain.Exam{TenantID: tenantID, SubjectID: &sid, Title: title, Status: domain.ExamPublished, QuestionCount: len(qs)}
	must(st.CreateExam(ctx, exam))
	for _, q := range qs {
		eid := exam.ID
		must(st.CreateQuestion(ctx, &domain.Question{
			TenantID: tenantID, SubjectID: subjectID, ExamID: &eid, Topic: "From material",
			Difficulty: q.diff, Stem: q.stem, Options: q.opts, Answer: q.ans, Explanation: q.expl,
			Marks: 1, AIGenerated: true, Approved: true, Confidence: 0.96, NeedsReview: false,
		}))
	}
	_, _ = st.Pool().Exec(ctx, `UPDATE exams SET published_at=now() WHERE id=$1`, exam.ID)
	return exam.ID
}

// seedMaterialWithDraftExam seeds one teacher-uploaded material (with AI teaching
// notes + RAG chunks) and a draft exam awaiting review, one question flagged.
func seedMaterialWithDraftExam(ctx context.Context, st *store.Store, tenantID, teacherID, subjectID, title string) {
	notes := "**Fractions — key ideas for Grade 4**\n\n" +
		"- A fraction shows equal parts of a whole, like $\\tfrac{1}{2}$ (one half).\n" +
		"- The bottom number (denominator) is how many equal parts; the top (numerator) is how many we take.\n" +
		"- With the same top number, a smaller bottom number means a bigger piece: $\\tfrac{1}{2} > \\tfrac{1}{4}$.\n\n" +
		"**Worked example:** half of 8 is $8 \\div 2 = 4$."
	m := &domain.Material{
		TenantID: tenantID, SubjectID: subjectID, Title: title, Source: "seed",
		UploadedBy: teacherID, Status: domain.MaterialReady,
		SourceFilename: "fractions-grade4.md", Summary: notes,
	}
	must(st.CreateMaterialFull(ctx, m))
	for i, f := range fractionFacts {
		must(st.CreateChunk(ctx, m.ID, f, nil, i+1))
	}
	sid, mid := subjectID, m.ID
	exam := &domain.Exam{
		TenantID: tenantID, SubjectID: &sid, MaterialID: &mid, CreatedBy: teacherID,
		Title: title + " — Exam", Status: domain.ExamNeedsReview, QuestionCount: 4,
	}
	must(st.CreateExam(ctx, exam))
	draft := []struct {
		examQ
		conf float64
		flag bool
	}{
		{examQ{"Which fraction is bigger: 1/2 or 1/4?", []string{"1/2", "1/4", "They are equal", "You cannot tell"}, "1/2", domain.DiffEasy, "Halves are bigger than quarters."}, 0.94, false},
		{examQ{"What is 1/2 of 8?", []string{"2", "3", "4", "5"}, "4", domain.DiffEasy, "$8\\div2=4$."}, 0.92, false},
		{examQ{"Half of a pizza is the same as ___ of the pizza.", []string{"1/2", "2/2", "1/4", "1/3"}, "1/2", domain.DiffMedium, "Half means $\\tfrac{1}{2}$."}, 0.86, false},
		{examQ{"Which is closest to one whole?", []string{"3/4", "1/4", "1/2", "2/8"}, "3/4", domain.DiffMedium, "$\\tfrac{3}{4}$ is nearest to 1."}, 0.57, true},
	}
	for _, d := range draft {
		eid := exam.ID
		must(st.CreateQuestion(ctx, &domain.Question{
			TenantID: tenantID, SubjectID: subjectID, ExamID: &eid, Topic: "From material",
			Difficulty: d.diff, Stem: d.stem, Options: d.opts, Answer: d.ans, Explanation: d.expl,
			Marks: 1, AIGenerated: true, Approved: false, Confidence: d.conf, NeedsReview: d.flag,
		}))
	}
}

// seedAttempt records a finished exam attempt with a score, N days ago.
func seedAttempt(ctx context.Context, st *store.Store, tenantID, studentID, subjectID, examID string, percent float64, daysAgo int) {
	_, err := st.Pool().Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, score, percent, snapshot, exam_id, finished_at)
		 VALUES ($1,$2,$3,$4,'finished',$5,$6,'[]',$7, now() - make_interval(days => $8))`,
		domain.NewID(), tenantID, studentID, subjectID, percent/20, percent, examID, daysAgo)
	must(err)
}

// seedPractice records a finished, ungraded practice attempt (exam_id NULL).
func seedPractice(ctx context.Context, st *store.Store, tenantID, studentID, subjectID string, percent float64, daysAgo int) {
	_, err := st.Pool().Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, score, percent, snapshot, finished_at)
		 VALUES ($1,$2,$3,$4,'finished',$5,$6,'[]', now() - make_interval(days => $7))`,
		domain.NewID(), tenantID, studentID, subjectID, percent/20, percent, daysAgo)
	must(err)
}

var fractionFacts = []string{
	"A fraction shows equal parts of a whole; one half is written 1/2.",
	"With the same numerator, a smaller denominator is a bigger piece: 1/2 is bigger than 1/4.",
	"One half of a number is that number divided by two; half of 8 is 4.",
	"Three quarters (3/4) is close to one whole.",
}

func must(err error) {
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
}
