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

type kdsNotificationUsecaseMocks struct {
	repo            *mock.MockKdsNotificationRepository
	deviceRepo      *mock.MockKdsDeviceRepository
	transactionRepo *mock.MockTransactionRepository
	pushGateway     *mock.MockKdsPushGatewayRepository
}

func newKdsNotificationUsecaseMocks(ctrl *gomock.Controller) kdsNotificationUsecaseMocks {
	return kdsNotificationUsecaseMocks{
		repo:            mock.NewMockKdsNotificationRepository(ctrl),
		deviceRepo:      mock.NewMockKdsDeviceRepository(ctrl),
		transactionRepo: mock.NewMockTransactionRepository(ctrl),
		pushGateway:     mock.NewMockKdsPushGatewayRepository(ctrl),
	}
}

func (m kdsNotificationUsecaseMocks) usecase() domain.KdsNotificationUsecase {
	return domain.NewKdsNotificationUsecase(m.repo, m.deviceRepo, m.transactionRepo, m.pushGateway, "default")
}

func kdsPendingNotification(id int64, transactionId int64) domain.KdsNotification {
	return domain.KdsNotification{Id: id, TransactionId: transactionId, Kind: domain.KdsNotificationKindOrderPaid, Status: domain.KdsNotificationStatusPending}
}

func kdsBarOnlyTransaction(id int64) domain.Transaction {
	return domain.Transaction{
		Id:                id,
		TransactionNumber: 12,
		TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
	}
}

func kdsDevice(id int64, name string, pushToken string) domain.KdsDevice {
	return domain.KdsDevice{Id: id, Name: name, PushToken: pushToken, Platform: domain.KdsPlatformAndroid}
}

func TestKdsNotificationUsecase_DispatchPending(t *testing.T) {
	t.Run("no pending rows does nothing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).Return(nil, nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	t.Run("claim failure returns the error and dispatches nothing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		err := mocks.usecase().DispatchPending(context.Background())

		require.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	// FR-4 step 5: every device carries the same message (D24), so one delivered phone means the
	// venue was told — a claimed row succeeding on every device is the common case.
	t.Run("success on every device marks the row sent", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)

		bar := kdsDevice(1, "Bar phone", "ExponentPushToken[bar]")
		kitchen := kdsDevice(2, "Kitchen phone", "ExponentPushToken[kitchen]")
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{bar, kitchen}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).DoAndReturn(
			func(_ context.Context, messages []domain.KdsPushMessage) ([]domain.KdsPushReceipt, *domain.Error) {
				require.Len(t, messages, 2)
				assert.Equal(t, "ExponentPushToken[bar]", messages[0].To)
				assert.Equal(t, "ExponentPushToken[kitchen]", messages[1].To)
				return []domain.KdsPushReceipt{
					{Status: domain.KdsPushReceiptStatusOk},
					{Status: domain.KdsPushReceiptStatusOk},
				}, nil
			})
		mocks.repo.EXPECT().MarkKdsNotificationSent(gomock.Any(), int64(1), gomock.Any()).Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// D10: a cash order buzzes the KDS twice — once at checkout (cash_pending), once when paid
	// (order_paid) — and both rows for the same transaction dispatch, with distinct messages.
	t.Run("a transaction with both a cash_pending and an order_paid row dispatches both, with kind-specific messages", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		cashPendingNotification := domain.KdsNotification{Id: 1, TransactionId: 10, Kind: domain.KdsNotificationKindCashPending, Status: domain.KdsNotificationStatusPending}
		orderPaidNotification := domain.KdsNotification{Id: 2, TransactionId: 10, Kind: domain.KdsNotificationKindOrderPaid, Status: domain.KdsNotificationStatusPending}

		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{cashPendingNotification, orderPaidNotification}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil).Times(2)

		bar := kdsDevice(1, "Bar phone", "ExponentPushToken[bar]")
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{bar}, nil).Times(2)

		var titles []string
		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Times(2).DoAndReturn(
			func(_ context.Context, messages []domain.KdsPushMessage) ([]domain.KdsPushReceipt, *domain.Error) {
				require.Len(t, messages, 1)
				titles = append(titles, messages[0].Title)
				return []domain.KdsPushReceipt{{Status: domain.KdsPushReceiptStatusOk}}, nil
			})
		mocks.repo.EXPECT().MarkKdsNotificationSent(gomock.Any(), int64(1), gomock.Any()).Return(nil)
		mocks.repo.EXPECT().MarkKdsNotificationSent(gomock.Any(), int64(2), gomock.Any()).Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
		assert.ElementsMatch(t, []string{"Cash order #12 — ", "New order #12 — "}, titles)
	})

	// FR-4 step 5: one device accepts, one fails — the row is still 'sent', with the failure
	// recorded rather than discarded, so a support question about one dead phone is answerable.
	t.Run("partial success marks the row sent with the failure recorded in detail", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)

		bar := kdsDevice(1, "Bar phone", "ExponentPushToken[bar]")
		kitchen := kdsDevice(2, "Kitchen phone", "ExponentPushToken[kitchen]")
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{bar, kitchen}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.KdsPushReceipt{
			{Status: domain.KdsPushReceiptStatusOk},
			{Status: domain.KdsPushReceiptStatusError, Message: "expo timeout"},
		}, nil)

		mocks.repo.EXPECT().MarkKdsNotificationSent(gomock.Any(), int64(1), gomock.Any()).DoAndReturn(
			func(_ context.Context, _ int64, detail string) *domain.Error {
				assert.Contains(t, detail, "Kitchen phone")
				assert.Contains(t, detail, "expo timeout")
				return nil
			})

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-4 step 5: nobody accepted — the row goes back to 'pending' (or 'failed' at the attempt
	// ceiling, which MarkKdsNotificationFailed's own repository test already covers).
	t.Run("total failure marks the row failed via MarkKdsNotificationFailed", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)

		bar := kdsDevice(1, "Bar phone", "ExponentPushToken[bar]")
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{bar}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.KdsPushReceipt{
			{Status: domain.KdsPushReceiptStatusError, Message: "expo timeout"},
		}, nil)

		mocks.repo.EXPECT().MarkKdsNotificationFailed(gomock.Any(), int64(1), gomock.Any()).DoAndReturn(
			func(_ context.Context, _ int64, detail string) *domain.Error {
				assert.Contains(t, detail, "expo timeout")
				return nil
			})

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// A gateway-level failure (a whole batch rejected) is total failure too, not a special case.
	t.Run("a push gateway error marks the row failed", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{kdsDevice(1, "Bar phone", "token")}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
			Return(nil, &domain.Error{Type: domain.BadGateway, Message: "failed to reach Expo push service"})
		mocks.repo.EXPECT().MarkKdsNotificationFailed(gomock.Any(), int64(1), "failed to reach Expo push service").Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// D18: DeviceNotRegistered is Expo's definitive "this token is dead" receipt — the only
	// signal that justifies deleting a device the operator registered.
	t.Run("DeviceNotRegistered prunes that device", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)

		bar := kdsDevice(1, "Bar phone", "ExponentPushToken[bar]")
		dead := kdsDevice(2, "Old phone", "ExponentPushToken[dead]")
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{bar, dead}, nil)

		mocks.pushGateway.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.KdsPushReceipt{
			{Status: domain.KdsPushReceiptStatusOk},
			{Status: domain.KdsPushReceiptStatusError, ErrorCode: domain.KdsPushErrorCodeDeviceNotRegistered, Message: "device not registered"},
		}, nil)

		mocks.deviceRepo.EXPECT().DeleteKdsDeviceById(gomock.Any(), int64(2)).Return(nil)
		mocks.repo.EXPECT().MarkKdsNotificationSent(gomock.Any(), int64(1), gomock.Any()).Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// FR-4 step 3: no devices at all — nobody to tell, and retrying does not create a phone.
	t.Run("no registered devices marks the row skipped", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).
			Return([]domain.KdsNotification{kdsPendingNotification(1, 10)}, nil)
		mocks.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(10)).Return(kdsBarOnlyTransaction(10), nil)
		mocks.deviceRepo.EXPECT().GetKdsDeviceList(gomock.Any()).Return(nil, nil)

		mocks.repo.EXPECT().MarkKdsNotificationSkipped(gomock.Any(), int64(1), "no registered devices").Return(nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})

	// ClaimPendingKdsNotifications filters by status = 'pending' (already covered at the
	// repository level); at the usecase level this is simply: nothing claimed, nothing dispatched.
	t.Run("a skipped row is never claimed, so it is never dispatched", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).Return(nil, nil)

		err := mocks.usecase().DispatchPending(context.Background())

		require.Nil(t, err)
	})
}

func TestKdsNotificationUsecase_TriggerDispatch(t *testing.T) {
	t.Run("runs DispatchPending in the background", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mocks := newKdsNotificationUsecaseMocks(ctrl)
		done := make(chan struct{})
		mocks.repo.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), 50).DoAndReturn(
			func(context.Context, int) ([]domain.KdsNotification, *domain.Error) {
				close(done)
				return nil, nil
			})

		mocks.usecase().TriggerDispatch()

		<-done
	})
}
