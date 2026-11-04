package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"testing"
	"time"

	"go.uber.org/mock/gomock"
)

const dispatchWaitTimeout = time.Second

func newKdsServiceExpectingDispatches(t *testing.T, times int) domain.KdsNotificationService {
	ctrl := gomock.NewController(t)
	repository := mock.NewMockKdsNotificationRepository(ctrl)
	dispatched := make(chan struct{}, 16)
	call := repository.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), gomock.Any()).DoAndReturn(
		func(_ any, _ int) ([]domain.KdsNotification, *domain.Error) {
			dispatched <- struct{}{}
			return nil, nil
		})
	waitForDispatches(t, call, times, dispatched)
	return domain.NewKdsNotificationService(repository, nil, nil, nil, "")
}

func newGuestServiceExpectingDispatches(t *testing.T, times int) domain.GuestNotificationService {
	ctrl := gomock.NewController(t)
	repository := mock.NewMockGuestNotificationRepository(ctrl)
	dispatched := make(chan struct{}, 16)
	call := repository.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), gomock.Any()).DoAndReturn(
		func(_ any, _ int) ([]domain.GuestNotification, *domain.Error) {
			dispatched <- struct{}{}
			return nil, nil
		})
	waitForDispatches(t, call, times, dispatched)
	return domain.NewGuestNotificationService(repository, nil, nil, nil, "")
}

func waitForDispatches(t *testing.T, call *gomock.Call, times int, dispatched chan struct{}) {
	call.Times(times)
	t.Cleanup(func() {
		for i := 0; i < times; i++ {
			select {
			case <-dispatched:
			case <-time.After(dispatchWaitTimeout):
				t.Errorf("expected %d dispatch sweeps, got %d", times, i)
				return
			}
		}
	})
}

func permissiveKdsNotificationService(ctrl *gomock.Controller) domain.KdsNotificationService {
	repository := mock.NewMockKdsNotificationRepository(ctrl)
	repository.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()
	return domain.NewKdsNotificationService(repository, nil, nil, nil, "")
}

func permissiveGuestNotificationService(ctrl *gomock.Controller) domain.GuestNotificationService {
	repository := mock.NewMockGuestNotificationRepository(ctrl)
	repository.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()
	return domain.NewGuestNotificationService(repository, nil, nil, nil, "")
}
