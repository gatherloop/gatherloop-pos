package domain_test

import (
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func newGuestNotificationUsecaseForTest(mocks guestNotificationServiceMocks) domain.GuestNotificationUsecase {
	return domain.NewGuestNotificationUsecase(mocks.repo, mocks.service())
}

func TestGuestNotificationUsecase_DispatchPending(t *testing.T) {
	t.Run("delegates to the service", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationServiceMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		err := newGuestNotificationUsecaseForTest(mocks).DispatchPending(context.Background())

		require.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})
}

// D8: called every sweep tick alongside DispatchPending, so a row a dispatcher claimed but never
// resolved does not sit in `sending` forever.
func TestGuestNotificationUsecase_ExpireStaleSending(t *testing.T) {
	t.Run("expires rows claimed before the stale threshold", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationServiceMocks(ctrl)
		mocks.repo.EXPECT().ExpireStaleSending(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, now time.Time) *domain.Error {
				assert.WithinDuration(t, time.Now().Add(-domain.GuestNotificationStaleSendingThreshold), now, time.Second)
				return nil
			})

		err := newGuestNotificationUsecaseForTest(mocks).ExpireStaleSending(context.Background())

		require.Nil(t, err)
	})
}
