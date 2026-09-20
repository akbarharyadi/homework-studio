// Package scheduler runs unattended background jobs. Today it generates each
// student's weekly progress report and writes their recap-video data — the
// "documents in, reports out, hands-off" automation, on a timer.
package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"homework-studio/internal/store"
)

type Scheduler struct {
	store      *store.Store
	interval   time.Duration
	storageDir string
}

func New(s *store.Store, interval, storageDir string) *Scheduler {
	d, err := time.ParseDuration(interval)
	if err != nil || d <= 0 {
		d = 6 * time.Hour
	}
	return &Scheduler{store: s, interval: d, storageDir: storageDir}
}

// Start runs the report job once immediately (so data exists right away), then on
// the interval, until the context is cancelled.
func (sc *Scheduler) Start(ctx context.Context) {
	if n, err := sc.RunOnce(ctx); err != nil {
		log.Printf("scheduler: initial run error: %v", err)
	} else {
		log.Printf("scheduler: generated %d student reports on startup (every %s)", n, sc.interval)
	}
	t := time.NewTicker(sc.interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if n, err := sc.RunOnce(ctx); err != nil {
				log.Printf("scheduler: run error: %v", err)
			} else {
				log.Printf("scheduler: regenerated %d student reports", n)
			}
		}
	}
}

// RunOnce generates a report + recap data for every student.
func (sc *Scheduler) RunOnce(ctx context.Context) (int, error) {
	refs, err := sc.store.AllStudents(ctx)
	if err != nil {
		return 0, err
	}
	// Fresh event log each run (per tenant), so the activity feed shows this run.
	seen := map[string]bool{}
	for _, ref := range refs {
		if !seen[ref.TenantID] {
			sc.store.ResetEvents(ctx, ref.TenantID)
			seen[ref.TenantID] = true
		}
	}
	count := 0
	for _, ref := range refs {
		prog, err := sc.store.StudentProgress(ctx, ref.TenantID, ref.ID)
		if err != nil {
			continue
		}

		top := ""
		best := -1.0
		subjects := make([]map[string]any, 0, len(prog.SubjectAverages))
		for _, s := range prog.SubjectAverages {
			subjects = append(subjects, map[string]any{
				"name": s.Subject, "average": round(s.Average), "color": s.Color,
			})
			if s.Average > best {
				best, top = s.Average, s.Subject
			}
		}
		timeline := make([]float64, 0, len(prog.Timeline))
		for _, p := range prog.Timeline {
			timeline = append(timeline, round(p.Percent))
		}
		done := len(prog.Timeline)

		recap := map[string]any{
			"studentName":    prog.StudentName,
			"gradeLevel":     prog.GradeLevel,
			"overallAverage": round(prog.OverallAverage),
			"homeworksDone":  done,
			"streakDays":     min(done, 7),
			"subjects":       subjects,
			"timeline":       timeline,
			"topSubject":     top,
		}
		recapBytes, _ := json.Marshal(recap)

		r := &store.StudentReport{
			TenantID:       ref.TenantID,
			StudentID:      ref.ID,
			OverallAverage: prog.OverallAverage,
			HomeworksDone:  done,
			TopSubject:     top,
			Narrative:      narrative(prog.StudentName, done, prog.OverallAverage, top),
			RecapJSON:      string(recapBytes),
		}
		if err := sc.store.UpsertStudentReport(ctx, r); err != nil {
			continue
		}
		sc.writeRecap(ref.ID, recapBytes)
		count++

		// Log what the automation did — reports written, and students it flagged.
		sc.store.InsertEvent(ctx, ref.TenantID, "report", ref.ID,
			fmt.Sprintf("Report generated for %s · %.0f%%", prog.StudentName, prog.OverallAverage), prog.OverallAverage)
		if done > 0 && prog.OverallAverage < 65 {
			sc.store.InsertEvent(ctx, ref.TenantID, "alert", ref.ID,
				fmt.Sprintf("Flagged %s for extra support · %.0f%%", prog.StudentName, prog.OverallAverage), prog.OverallAverage)
		}
	}
	return count, nil
}

func (sc *Scheduler) writeRecap(studentID string, data []byte) {
	dir := filepath.Join(sc.storageDir, "recaps")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return
	}
	_ = os.WriteFile(filepath.Join(dir, studentID+".json"), data, 0o644)
}

func narrative(name string, done int, avg float64, top string) string {
	first := name
	if i := strings.IndexByte(name, ' '); i > 0 {
		first = name[:i]
	}
	s := fmt.Sprintf("%s completed %d homework", first, done)
	if done != 1 {
		s += "s"
	}
	s += fmt.Sprintf(" this week with an overall average of %.0f%%.", avg)
	if top != "" {
		s += fmt.Sprintf(" Strongest in %s.", top)
	}
	s += " Keep up the great effort! 🌟"
	return s
}

func round(v float64) float64 { return math.Round(v*100) / 100 }

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
