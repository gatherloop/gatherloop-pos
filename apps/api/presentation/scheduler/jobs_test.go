package scheduler

import (
	"apps/api/utils/logger"
	"testing"
)

func registeredJobNames(scheduler *Scheduler) []string {
	names := []string{}
	for _, job := range scheduler.jobs {
		names = append(names, job.Name())
	}
	return names
}

func assertRegisteredJobNames(t *testing.T, scheduler *Scheduler, expected []string) {
	t.Helper()

	actual := registeredJobNames(scheduler)
	if len(actual) != len(expected) {
		t.Fatalf("registered %d jobs (%v), want %d (%v)", len(actual), actual, len(expected), expected)
	}

	for index, name := range expected {
		if actual[index] != name {
			t.Fatalf("job %d registered as %q, want %q (full order: %v)", index, actual[index], name, actual)
		}
	}
}

func newJobScheduler() *Scheduler {
	return New(1, logger.New("test", "test", "error"))
}
