package pipeline

import (
	"testing"

	"homework-studio/internal/domain"
)

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		" 15 ":            "15",
		"Carbon Dioxide":  "carbon dioxide",
		"6 (unclear)":     "6",
		"  Mercury  ":     "mercury",
	}
	for in, want := range cases {
		if got := normalize(in); got != want {
			t.Errorf("normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestLinkTasksToItems(t *testing.T) {
	items := []domain.HomeworkItem{{QuestionNo: 1}, {QuestionNo: 2}, {QuestionNo: 3}}
	tasks := []domain.ReviewTask{{FieldName: "Q2 answer"}}
	linkTasksToItems(items, tasks)

	if items[1].ID == "" {
		t.Fatal("item IDs should be assigned")
	}
	if tasks[0].ItemID == nil || *tasks[0].ItemID != items[1].ID {
		t.Fatal("review task was not linked to the Q2 item")
	}
}
