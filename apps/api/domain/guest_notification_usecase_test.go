package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

type guestNotificationUsecaseMocks struct {
	repo             *mock.MockGuestNotificationRepository
	subscriptionRepo *mock.MockWebPushSubscriptionRepository
	transactionRepo  *mock.MockTransactionRepository
	paymentRepo      *mock.MockPaymentRepository
	pushGateway      *mock.MockWebPushGatewayRepository
}

func newGuestNotificationUsecaseMocks(ctrl *gomock.Controller) guestNotificationUsecaseMocks {
	return guestNotificationUsecaseMocks{
		repo:             mock.NewMockGuestNotificationRepository(ctrl),
		subscriptionRepo: mock.NewMockWebPushSubscriptionRepository(ctrl),
		transactionRepo:  mock.NewMockTransactionRepository(ctrl),
		paymentRepo:      mock.NewMockPaymentRepository(ctrl),
		pushGateway:      mock.NewMockWebPushGatewayRepository(ctrl),
	}
}

func (m guestNotificationUsecaseMocks) usecase() domain.GuestNotificationUsecase {
	return domain.NewGuestNotificationUsecase(m.repo, m.subscriptionRepo, m.transactionRepo, m.paymentRepo, m.pushGateway)
}

func guestPendingNotification(id int64, transactionId int64, sessionId string) domain.GuestNotification {
	return domain.GuestNotification{Id: id, TransactionId: transactionId, SessionId: sessionId, Status: domain.GuestNotificationStatusPending}
}

func guestOrderTransaction(id int64) domain.Transaction {
	return domain.Transaction{Id: id, TransactionNumber: 12, Name: "Budi"}
}

func guestSubscription(id int64, sessionId string, endpoint string) domain.WebPushSubscription {
	return domain.WebPushSubscription{Id: id, SessionId: sessionId, Endpoint: endpoint, P256dhKey: "p256dh", AuthKey: "auth"}
}

func TestGuestNotificationUsecase_DispatchPending(t *testing.T) {
	t.Run("no pending rows does nothing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).Return(nil, nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	t.Run("claim failure returns the error and dispatches nothing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		err := mocks.usecase().DispatchPending(context.Background())

		require.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	// FR-4 step 5: every subscription carries the same message, so one delivered browser means
	// the guest was told — a claimed row succeeding on every subscription is the common case.
	t.Run("success on every subscription marks the row sent", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)

		phone := guestSubscription(1, "session-1", "https://fcm.googleapis.com/fcm/send/phone")
		tablet := guestSubscription(2, "session-1", "https://fcm.googleapis.com/fcm/send/tablet")
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").
			Return([]domain.WebPushSubscription{phone, tablet}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).DoAndReturn(
			func(_ context.Context, messages []domain.WebPushMessage) ([]domain.WebPushReceipt, *domain.Error) {
				require.Len(t, messages, 2)
				assert.Equal(t, phone.Endpoint, messages[0].Endpoint)
				assert.Equal(t, tablet.Endpoint, messages[1].Endpoint)
				assert.Equal(t, "order-ORD-1", messages[0].Tag)
				return []domain.WebPushReceipt{
					{Status: domain.WebPushReceiptStatusOk},
					{Status: domain.WebPushReceiptStatusOk},
				}, nil
			})
		mocks.repo.EXPECT().MarkGuestNotificationSent(gomock.Any(), int64(1), gomock.Any()).Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-4 step 5: one subscription accepts, one fails — the row is still 'sent', with the
	// failure recorded rather than discarded, so a support question about one dead browser is
	// answerable.
	t.Run("partial success marks the row sent with the failure recorded in detail", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)

		phone := guestSubscription(1, "session-1", "https://fcm.googleapis.com/fcm/send/phone")
		tablet := guestSubscription(2, "session-1", "https://fcm.googleapis.com/fcm/send/tablet")
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").
			Return([]domain.WebPushSubscription{phone, tablet}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.WebPushReceipt{
			{Status: domain.WebPushReceiptStatusOk},
			{Status: domain.WebPushReceiptStatusError, Message: "push service timeout"},
		}, nil)

		mocks.repo.EXPECT().MarkGuestNotificationSent(gomock.Any(), int64(1), gomock.Any()).DoAndReturn(
			func(_ context.Context, _ int64, detail string) *domain.Error {
				assert.Contains(t, detail, tablet.Endpoint)
				assert.Contains(t, detail, "push service timeout")
				return nil
			})

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-4 step 5: nobody accepted — the row goes back to 'pending' (or 'failed' at the attempt
	// ceiling, which MarkGuestNotificationFailed's own repository test already covers).
	t.Run("total failure marks the row failed via MarkGuestNotificationFailed", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)

		phone := guestSubscription(1, "session-1", "https://fcm.googleapis.com/fcm/send/phone")
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").
			Return([]domain.WebPushSubscription{phone}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.WebPushReceipt{
			{Status: domain.WebPushReceiptStatusError, Message: "push service timeout"},
		}, nil)

		mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), int64(1), gomock.Any()).DoAndReturn(
			func(_ context.Context, _ int64, detail string) *domain.Error {
				assert.Contains(t, detail, "push service timeout")
				return nil
			})

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// A gateway-level failure (a whole batch rejected) is total failure too, not a special case.
	t.Run("a push gateway error marks the row failed", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").
			Return([]domain.WebPushSubscription{guestSubscription(1, "session-1", "https://fcm.googleapis.com/fcm/send/phone")}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(nil, &domain.Error{Type: domain.BadGateway, Message: "failed to reach push service"})
		mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), int64(1), "failed to reach push service").Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// D10: a 404/410 is the Web Push protocol's definitive "this subscription is dead" receipt,
	// the only signal that justifies pruning a subscription the guest granted.
	t.Run("a gone receipt prunes that subscription", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)

		phone := guestSubscription(1, "session-1", "https://fcm.googleapis.com/fcm/send/phone")
		dead := guestSubscription(2, "session-1", "https://fcm.googleapis.com/fcm/send/dead")
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").
			Return([]domain.WebPushSubscription{phone, dead}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.WebPushReceipt{
			{Status: domain.WebPushReceiptStatusOk},
			{Status: domain.WebPushReceiptStatusError, ErrorCode: domain.WebPushErrorCodeGone, Message: "gone"},
		}, nil)

		mocks.subscriptionRepo.EXPECT().UnsubscribeWebPush(gomock.Any(), "session-1", dead.Endpoint).Return(nil)
		mocks.repo.EXPECT().MarkGuestNotificationSent(gomock.Any(), int64(1), gomock.Any()).Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-4 step 3: the guest never opted in; retrying does not create a subscription.
	t.Run("no active subscription for session marks the row skipped", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(domain.Payment{PartnerReferenceNo: "ORD-1"}, nil)
		mocks.subscriptionRepo.EXPECT().GetWebPushSubscriptionsBySessionId(gomock.Any(), "session-1").Return(nil, nil)

		mocks.repo.EXPECT().MarkGuestNotificationSkipped(gomock.Any(), int64(1), "no active subscription for session").Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// ClaimPendingGuestNotifications filters by status = 'pending' (already covered at the
	// repository level); at the usecase level this is simply: nothing claimed, nothing dispatched.
	t.Run("a skipped row is never claimed, so it is never dispatched", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).Return(nil, nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})
}

func TestGuestNotificationUsecase_TriggerDispatch(t *testing.T) {
	t.Run("runs DispatchPending in the background", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		done := make(chan struct{})
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).DoAndReturn(
			func(context.Context, int) ([]domain.GuestNotification, *domain.Error) {
				close(done)
				return nil, nil
			})

		mocks.usecase().TriggerDispatch()

		<-done
	})
}
