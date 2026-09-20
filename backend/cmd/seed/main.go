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

	// --- Students (Aisha is linked to the parent login) ---
	aisha := &domain.Student{TenantID: tenant.ID, Name: "Aisha Putri", GradeLevel: "Grade 4", ParentUserID: &parent.ID}
	students := []*domain.Student{
		aisha,
		{TenantID: tenant.ID, Name: "Budi Santoso", GradeLevel: "Grade 4"},
		{TenantID: tenant.ID, Name: "Chandra Wijaya", GradeLevel: "Grade 4"},
		{TenantID: tenant.ID, Name: "Dewi Lestari", GradeLevel: "Grade 5"},
		{TenantID: tenant.ID, Name: "Eka Pratama", GradeLevel: "Grade 5"},
	}
	for _, s := range students {
		must(st.CreateStudent(ctx, s))
	}

	// --- Question bank ---
	seedMathQuestions(ctx, st, tenant.ID, math.ID)
	seedScienceQuestions(ctx, st, tenant.ID, science.ID)

	// --- RAG material ---
	seedMaterial(ctx, st, tenant.ID, science.ID, "Science Basics", scienceFacts)
	seedMaterial(ctx, st, tenant.ID, math.ID, "Math Basics", mathFacts)

	log.Printf("✅ demo seeded.\n  School: %s\n  Logins (password %q):\n    teacher@demo.id\n    parent@demo.id\n    student@demo.id\n    admin@demo.id\n  Subjects: Math, Science. Students: %d. Bank + material loaded.",
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

func must(err error) {
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
}
