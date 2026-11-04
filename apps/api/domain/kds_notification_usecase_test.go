package domain_test

import (
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestKdsNotificationUsecase_DispatchPending(t *testing.T) {
	t.Run("delegates to the service", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationServiceMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		err := domain.NewKdsNotificationUsecase(mocks.service()).DispatchPending(context.Background())

		require.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})
}
