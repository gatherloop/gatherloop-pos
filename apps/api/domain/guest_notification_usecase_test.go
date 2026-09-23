package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

const guestOrderWebBaseURL = "https://order.gatherloop.id"

type guestNotificationUsecaseMocks struct {
	repo            *mock.MockGuestNotificationRepository
	transactionRepo *mock.MockTransactionRepository
	paymentRepo     *mock.MockPaymentRepository
	whatsappGateway *mock.MockWhatsAppGatewayRepository
}

func newGuestNotificationUsecaseMocks(ctrl *gomock.Controller) guestNotificationUsecaseMocks {
	return guestNotificationUsecaseMocks{
		repo:            mock.NewMockGuestNotificationRepository(ctrl),
		transactionRepo: mock.NewMockTransactionRepository(ctrl),
		paymentRepo:     mock.NewMockPaymentRepository(ctrl),
		whatsappGateway: mock.NewMockWhatsAppGatewayRepository(ctrl),
	}
}

func (m guestNotificationUsecaseMocks) usecase() domain.GuestNotificationUsecase {
	return domain.NewGuestNotificationUsecase(m.repo, m.transactionRepo, m.paymentRepo, m.whatsappGateway, guestOrderWebBaseURL)
}

func guestPendingNotification(id int64, transactionId int64, sessionId string, whatsappNumber string) domain.GuestNotification {
	return domain.GuestNotification{Id: id, TransactionId: transactionId, SessionId: sessionId, WhatsappNumber: &whatsappNumber, Status: domain.GuestNotificationStatusPending}
}

func guestOrderTransaction(id int64) domain.Transaction {
	return domain.Transaction{Id: id, TransactionNumber: 12, Name: "Budi"}
}

func guestOrderPayment(accessKey string) domain.Payment {
	return domain.Payment{PartnerReferenceNo: "ORD-1", Method: domain.PaymentMethodQris, AccessKey: &accessKey}
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

	// FR-7 step 4 "accepted": the row is marked sent with Fonnte's provider message id.
	t.Run("accepted marks the row sent with the provider message id", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1", "6281234567890")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("q3Vd0bX9pL2sR8tY1wZa7c"), nil)

		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).DoAndReturn(
			func(_ context.Context, message domain.WhatsAppMessage) (domain.WhatsAppSendResult, *domain.Error) {
				assert.Equal(t, "6281234567890", message.To)
				assert.Contains(t, message.Body, "https://order.gatherloop.id/orders/ORD-1?k=q3Vd0bX9pL2sR8tY1wZa7c")
				return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeAccepted, ProviderMessageId: "abc123"}, nil
			})
		mocks.repo.EXPECT().MarkGuestNotificationSent(gomock.Any(), int64(1), "abc123").Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-7 step 4 "rejected": four rejections stay pending (attempt_count below the ceiling), and
	// the fifth attempt is accepted — nothing was ever sent, so retrying cost nothing.
	t.Run("rejected four times then accepted marks the row sent", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		notification := guestPendingNotification(1, 10, "session-1", "6281234567890")

		for i := 0; i < 4; i++ {
			mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
				Return([]domain.GuestNotification{notification}, nil)
			mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
			mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("k"), nil)
			mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
				Return(domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: "device not connected"}, nil)
			mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), int64(1), "device not connected").Return(nil)

			require.Nil(t, mocks.usecase().DispatchPending(context.Background()))
		}

		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{notification}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("k"), nil)
		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeAccepted, ProviderMessageId: "abc123"}, nil)
		mocks.repo.EXPECT().MarkGuestNotificationSent(gomock.Any(), int64(1), "abc123").Return(nil)

		require.Nil(t, mocks.usecase().DispatchPending(context.Background()))
	})

	// FR-7 step 4 "rejected": the repository test for MarkGuestNotificationFailed already covers
	// the fifth rejection becoming 'failed' — at the usecase level this is simply: five rejections,
	// five calls to MarkGuestNotificationFailed, no special casing on the last one.
	t.Run("rejected five times marks the row failed via MarkGuestNotificationFailed each time", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		notification := guestPendingNotification(1, 10, "session-1", "6281234567890")

		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{notification}, nil).Times(5)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil).Times(5)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("k"), nil).Times(5)
		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: "quota exceeded"}, nil).Times(5)
		mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), int64(1), "quota exceeded").Return(nil).Times(5)

		for i := 0; i < 5; i++ {
			require.Nil(t, mocks.usecase().DispatchPending(context.Background()))
		}
	})

	// FR-7 step 4 "unknown"/D9: an ambiguous outcome is marked failed directly and never retried.
	t.Run("unknown outcome marks the row failed and is never re-claimed", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1", "6281234567890")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("k"), nil)
		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeUnknown, Detail: "outcome unknown: request timed out"}, nil)
		mocks.repo.EXPECT().MarkGuestNotificationUnknownOutcome(gomock.Any(), int64(1), "outcome unknown: request timed out").Return(nil)
		mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-5/D16: a row already claimed with no number (a pre-cutover row) is recorded skipped on
	// this, its only claim, without ever calling the gateway.
	t.Run("no whatsapp number on the claimed row marks it skipped without sending", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{{Id: 1, TransactionId: 10, SessionId: "session-1", Status: domain.GuestNotificationStatusPending}}, nil)

		mocks.repo.EXPECT().MarkGuestNotificationSkipped(gomock.Any(), int64(1), "no whatsapp number for order").Return(nil)
		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Times(0)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// D10: the disabled gateway's sentinel detail is a configuration fact, not a delivery failure
	// — it is recorded skipped and never retried.
	t.Run("the disabled gateway's sentinel detail marks the row skipped, not retried", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), 50).
			Return([]domain.GuestNotification{guestPendingNotification(1, 10, "session-1", "6281234567890")}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(guestOrderTransaction(10), nil)
		mocks.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(10)).Return(guestOrderPayment("k"), nil)
		mocks.whatsappGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: domain.WhatsAppGatewayNotConfiguredDetail}, nil)

		mocks.repo.EXPECT().MarkGuestNotificationSkipped(gomock.Any(), int64(1), domain.WhatsAppGatewayNotConfiguredDetail).Return(nil)
		mocks.repo.EXPECT().MarkGuestNotificationFailed(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

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

// D8: called every sweep tick alongside DispatchPending, so a row a dispatcher claimed but never
// resolved does not sit in `sending` forever.
func TestGuestNotificationUsecase_ExpireStaleSending(t *testing.T) {
	t.Run("expires rows claimed before the stale threshold", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newGuestNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ExpireStaleSending(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, now time.Time) *domain.Error {
				assert.WithinDuration(t, time.Now().Add(-domain.GuestNotificationStaleSendingThreshold), now, time.Second)
				return nil
			})

		err := mocks.usecase().ExpireStaleSending(context.Background())

		require.Nil(t, err)
	})
}
