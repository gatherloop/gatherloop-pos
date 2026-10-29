package scheduler

import (
	"apps/api/domain"
	"context"
	"log/slog"
	"sync"
	"time"
)

type Job interface {
	Name() string
	Run(ctx context.Context) *domain.Error
}

type Scheduler struct {
	jobs            []Job
	intervalSeconds int
	logger          *slog.Logger
	stop            context.CancelFunc
	waitGroup       sync.WaitGroup
}

func New(intervalSeconds int, logger *slog.Logger) *Scheduler {
	return &Scheduler{intervalSeconds: intervalSeconds, logger: logger}
}

func (scheduler *Scheduler) AddJob(job Job) {
	scheduler.jobs = append(scheduler.jobs, job)
}

func (scheduler *Scheduler) Start() {
	ctx, stop := context.WithCancel(context.Background())
	scheduler.stop = stop

	scheduler.waitGroup.Add(1)
	go func() {
		defer scheduler.waitGroup.Done()
		scheduler.run(ctx)
	}()
}

func (scheduler *Scheduler) Stop() {
	if scheduler.stop == nil {
		return
	}

	scheduler.stop()
	scheduler.waitGroup.Wait()
}

func (scheduler *Scheduler) run(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(scheduler.intervalSeconds) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, job := range scheduler.jobs {
				scheduler.runJob(job)
			}
		}
	}
}

func (scheduler *Scheduler) runJob(job Job) {
	if err := job.Run(context.Background()); err != nil {
		scheduler.logger.Error("maintenance job failed",
			slog.String("job", job.Name()),
			slog.Any("error", err),
		)
	}
}
