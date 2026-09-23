package main

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/utils/logger"
	"context"
	"testing"
	"time"

	"go.uber.org/mock/gomock"
)

// D5/FR-4: one sweeper drives both outboxes and the payment expiry sweep, so a single tick must
// call the KDS dispatcher, the guest dispatcher and ExpireStalePayments rather than only the KDS
// one it started as.
func TestRunMaintenanceSweeper_CallsEveryJobPerTick(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	kdsNotificationRepo := mock.NewMockKdsNotificationRepository(ctrl)
	kdsDeviceRepo := mock.NewMockKdsDeviceRepository(ctrl)
	kdsTransactionRepo := mock.NewMockTransactionRepository(ctrl)
	kdsPushGateway := mock.NewMockKdsPushGatewayRepository(ctrl)
	kdsNotificationUsecase := domain.NewKdsNotificationUsecase(kdsNotificationRepo, kdsDeviceRepo, kdsTransactionRepo, kdsPushGateway, "default")

	guestNotificationRepo := mock.NewMockGuestNotificationRepository(ctrl)
	subscriptionRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
	guestTransactionRepo := mock.NewMockTransactionRepository(ctrl)
	paymentRepo := mock.NewMockPaymentRepository(ctrl)
	webPushGateway := mock.NewMockWebPushGatewayRepository(ctrl)
	guestNotificationUsecase := domain.NewGuestNotificationUsecase(guestNotificationRepo, subscriptionRepo, guestTransactionRepo, paymentRepo, webPushGateway)

	gatewayRepo := mock.NewMockPaymentGatewayRepository(ctrl)
	customerRepo := mock.NewMockCustomerRepository(ctrl)
	cartRepo := mock.NewMockCartRepository(ctrl)
	paymentTransactionRepo := mock.NewMockTransactionRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
	kdsNotificationDispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
	availabilityReservation := domain.NewAvailabilityReservation(availabilityRepo)
	paymentUsecase := domain.NewPaymentUsecase(paymentRepo, gatewayRepo, customerRepo, cartRepo, paymentTransactionRepo, variantRepo, walletRepo, availabilityReservation, kdsNotificationRepo, kdsNotificationDispatcher, 300, 600, 1)

	kdsCalled := make(chan struct{}, 1)
	guestCalled := make(chan struct{}, 1)
	paymentCalled := make(chan struct{}, 1)
	kdsNotificationRepo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), gomock.Any()).DoAndReturn(
		func(context.Context, int) ([]domain.KdsNotification, *domain.Error) {
			kdsCalled <- struct{}{}
			return nil, nil
		}).AnyTimes()
	guestNotificationRepo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), gomock.Any()).DoAndReturn(
		func(context.Context, int) ([]domain.GuestNotification, *domain.Error) {
			guestCalled <- struct{}{}
			return nil, nil
		}).AnyTimes()
	guestNotificationRepo.EXPECT().ExpireStaleSending(gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
	paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
		func(context.Context, time.Time, int) ([]domain.Payment, *domain.Error) {
			paymentCalled <- struct{}{}
			return nil, nil
		}).AnyTimes()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() {
		defer close(done)
		runMaintenanceSweeper(ctx, kdsNotificationUsecase, guestNotificationUsecase, paymentUsecase, 1, logger.New("test", "test", "error"))
	}()

	timeout := time.After(5 * time.Second)
	for _, called := range []chan struct{}{kdsCalled, guestCalled, paymentCalled} {
		select {
		case <-called:
		case <-timeout:
			t.Fatal("timed out waiting for the sweeper to dispatch")
		}
	}

	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("sweeper did not stop after cancellation")
	}
}
