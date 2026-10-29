package scheduler

import (
	"apps/api/domain"
	"apps/api/utils/logger"
	"context"
	"testing"
	"time"
)

type fakeJob struct {
	name   string
	err    *domain.Error
	onRun  func()
	runLog *[]string
}

func (job *fakeJob) Name() string {
	return job.name
}

func (job *fakeJob) Run(ctx context.Context) *domain.Error {
	if job.runLog != nil {
		*job.runLog = append(*job.runLog, job.name)
	}

	if job.onRun != nil {
		job.onRun()
	}

	return job.err
}

func newTestScheduler() *Scheduler {
	return New(1, logger.New("test", "test", "error"))
}

func signalOnce(signal chan struct{}) func() {
	return func() {
		select {
		case signal <- struct{}{}:
		default:
		}
	}
}

func waitFor(t *testing.T, signal chan struct{}, message string) {
	t.Helper()

	select {
	case <-signal:
	case <-time.After(5 * time.Second):
		t.Fatal(message)
	}
}

// D5/FR-4: one ticker drives every registered job, so a single tick must reach all of them rather
// than only the KDS dispatch this started as.
func TestScheduler_RunsEveryRegisteredJobPerTick(t *testing.T) {
	scheduler := newTestScheduler()

	names := []string{"first", "second", "third"}
	called := map[string]chan struct{}{}

	for _, name := range names {
		signal := make(chan struct{}, 1)
		called[name] = signal
		scheduler.AddJob(&fakeJob{name: name, onRun: signalOnce(signal)})
	}

	scheduler.Start()
	defer scheduler.Stop()

	for _, name := range names {
		waitFor(t, called[name], "timed out waiting for job "+name+" to run")
	}
}

func TestScheduler_RunsJobsInRegistrationOrder(t *testing.T) {
	scheduler := newTestScheduler()

	runLog := []string{}
	lastJobRan := make(chan struct{}, 1)

	scheduler.AddJob(&fakeJob{name: "first", runLog: &runLog})
	scheduler.AddJob(&fakeJob{name: "second", runLog: &runLog})
	scheduler.AddJob(&fakeJob{name: "third", runLog: &runLog, onRun: signalOnce(lastJobRan)})

	scheduler.Start()
	waitFor(t, lastJobRan, "timed out waiting for the last job to run")

	// Stop drains the loop goroutine, so runLog is safe to read and can no longer grow.
	scheduler.Stop()

	for index, expected := range []string{"first", "second", "third"} {
		if runLog[index] != expected {
			t.Fatalf("job %d ran as %q, want %q (full order: %v)", index, runLog[index], expected, runLog)
		}
	}
}

// A sweep that fails is logged, not propagated: the jobs registered after it still run on the
// same tick.
func TestScheduler_FailingJobDoesNotStopLaterJobs(t *testing.T) {
	scheduler := newTestScheduler()

	laterJobRan := make(chan struct{}, 1)

	scheduler.AddJob(&fakeJob{name: "failing", err: &domain.Error{Type: domain.InternalServerError, Message: "boom"}})
	scheduler.AddJob(&fakeJob{name: "later", onRun: signalOnce(laterJobRan)})

	scheduler.Start()
	defer scheduler.Stop()

	waitFor(t, laterJobRan, "a failing job prevented the jobs registered after it from running")
}

func TestScheduler_StopReturnsAfterTheLoopExits(t *testing.T) {
	scheduler := newTestScheduler()
	scheduler.AddJob(&fakeJob{name: "noop"})
	scheduler.Start()

	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		scheduler.Stop()
	}()

	waitFor(t, stopped, "Stop did not return after cancelling the loop")
}

func TestScheduler_StopBeforeStartIsSafe(t *testing.T) {
	newTestScheduler().Stop()
}
