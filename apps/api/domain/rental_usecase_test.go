package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func ptrInt64(v int64) *int64 {
	return &v
}

func ptrString(v string) *string {
	return &v
}

func TestRentalUsecase_GetRentalList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(rentalRepo *mock.MockRentalRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.CheckoutStatusAll).
					Return([]domain.Rental{{Id: 1}, {Id: 2}}, nil)
				rentalRepo.EXPECT().GetRentalListTotal(gomock.Any(), "", domain.CheckoutStatusAll).Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "error",
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			ticketRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(rentalRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo, ticketRepo)
			rentals, _, err := usecase.GetRentalList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.CheckoutStatusAll)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, rentals, tt.expectedLen)
			}
		})
	}
}

func TestRentalUsecase_DeleteRentalById(t *testing.T) {
	checkoutAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		setupMock     func(rentalRepo *mock.MockRentalRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — not checked out",
			id:   1,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).Return(domain.Rental{Id: 1, CheckoutAt: nil}, nil)
				rentalRepo.EXPECT().DeleteRentalById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "rental already checked out",
			id:   2,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(2)).Return(domain.Rental{Id: 2, CheckoutAt: &checkoutAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "rental not found",
			id:   99,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(99)).Return(domain.Rental{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			ticketRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(rentalRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo, ticketRepo)
			err := usecase.DeleteRentalById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestRentalUsecase_CheckinRentals(t *testing.T) {
	tests := []struct {
		name               string
		input              []domain.Rental
		setupMock          func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository)
		expectedLen        int
		expectedTierCount  int
		expectedTicketId   *int64
		expectedTicketName *string
		expectedError      *domain.Error
	}{
		{
			name:  "success — tiers snapshot copied from variant",
			input: []domain.Rental{{Code: "A1", VariantId: 10}},
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).
					Return(domain.Variant{Id: 10, PricingTiers: hourlyTiers}, nil)
				ticketRepo.EXPECT().GetTicketByCode(gomock.Any(), "A1").
					Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, rentals []domain.Rental) ([]domain.Rental, *domain.Error) {
						return rentals, nil
					})
			},
			expectedLen:       1,
			expectedTierCount: 15,
		},
		{
			name:  "success — registered ticket resolved and snapshotted (FR-3)",
			input: []domain.Rental{{Code: "0xA3F19C82", VariantId: 10}},
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).
					Return(domain.Variant{Id: 10, PricingTiers: hourlyTiers}, nil)
				ticketRepo.EXPECT().GetTicketByCode(gomock.Any(), "0xA3F19C82").
					Return(domain.Ticket{Id: 7, Code: "0xA3F19C82", Name: "Ticket 01"}, nil)
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, rentals []domain.Rental) ([]domain.Rental, *domain.Error) {
						return rentals, nil
					})
			},
			expectedLen:        1,
			expectedTierCount:  15,
			expectedTicketId:   ptrInt64(7),
			expectedTicketName: ptrString("Ticket 01"),
		},
		{
			name:  "error — rental variant has no pricing tiers",
			input: []domain.Rental{{Code: "A1", VariantId: 10}},
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).
					Return(domain.Variant{Id: 10, PricingTiers: []domain.PricingTier{}}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "error — variant not found",
			input: []domain.Rental{{Code: "A1", VariantId: 99}},
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(99)).
					Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:  "error — repository error on insert",
			input: []domain.Rental{{Code: "A1", VariantId: 10}},
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, ticketRepo *mock.MockTicketRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).
					Return(domain.Variant{Id: 10, PricingTiers: hourlyTiers}, nil)
				ticketRepo.EXPECT().GetTicketByCode(gomock.Any(), "A1").
					Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			ticketRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(rentalRepo, variantRepo, ticketRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo, ticketRepo)
			rentals, err := usecase.CheckinRentals(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, rentals, tt.expectedLen)
				if tt.expectedTierCount > 0 {
					assert.Len(t, rentals[0].PricingTiers, tt.expectedTierCount)
				}
				assert.Equal(t, tt.expectedTicketId, rentals[0].TicketId)
				assert.Equal(t, tt.expectedTicketName, rentals[0].TicketName)
			}
		})
	}
}

func TestRentalUsecase_CheckoutRentals(t *testing.T) {
	makeCheckinAt := func(minutesAgo int) time.Time {
		return time.Now().Add(-time.Duration(minutesAgo) * time.Minute)
	}

	tests := []struct {
		name                string
		rentalIds           []int64
		setupMock           func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time)
		checkinAt           int // minutes ago
		expectedPrice       float32
		expectedNote        *string
		expectedProductName string
		expectedError       *domain.Error
	}{
		{
			name:      "FR-5 row 1: 2h (119min) → tier 120 → 30K",
			rentalIds: []int64{1},
			checkinAt: 119,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice:       30000,
			expectedNote:        ptrString("2 hour(s)"),
			expectedProductName: "Catan",
		},
		{
			name:      "FR-5 (Phase 5): mapped ticket prepends ticket name to note",
			rentalIds: []int64{1},
			checkinAt: 119,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt, TicketName: ptrString("Ticket 01")}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 30000,
			expectedNote:  ptrString("Ticket 01 - 2 hour(s)"),
		},
		{
			name:      "FR-5 (Phase 5): unmapped rental keeps duration-only note",
			rentalIds: []int64{1},
			checkinAt: 119,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt, TicketName: nil}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 30000,
			expectedNote:  ptrString("2 hour(s)"),
		},
		{
			name:      "FR-5 row 3: 1h15m → first tier ≥75 is 90 → 20K",
			rentalIds: []int64{1},
			checkinAt: 75,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 20000,
		},
		{
			name:      "FR-5 row 4: 1h35m (95min) → tier 120 → 30K",
			rentalIds: []int64{1},
			checkinAt: 95,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 30000,
		},
		{
			name:      "FR-5 row 5: 7h (419min) → tier 420 → 105K",
			rentalIds: []int64{1},
			checkinAt: 419,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 105000,
		},
		{
			name:      "FR-5 row 6: 9h (540min) → cap at last tier → 120K",
			rentalIds: []int64{1},
			checkinAt: 540,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 10, PricingTiers: hourlyTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 120000,
		},
		{
			name:      "FR-5 row 7: All Day Weekday (1-tier at 840min → 50K)",
			rentalIds: []int64{1},
			checkinAt: 200,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				allDayTiers := []domain.PricingTier{{UpToMinutes: 840, Price: 50000}}
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, VariantId: 20, PricingTiers: allDayTiers, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), gomock.Any()).
					Return(domain.Variant{Product: domain.Product{Name: "Catan"}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedPrice: 50000,
		},
		{
			name:      "error — rental already checked out",
			rentalIds: []int64{1},
			checkinAt: 60,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				checkoutAt := time.Now()
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, CheckoutAt: &checkoutAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "error — snapshot has no tiers",
			rentalIds: []int64{1},
			checkinAt: 60,
			setupMock: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository, checkinAt time.Time) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).
					Return(domain.Rental{Id: 1, PricingTiers: []domain.PricingTier{}, CheckinAt: checkinAt}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			checkinAt := makeCheckinAt(tt.checkinAt)
			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			ticketRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(rentalRepo, variantRepo, txRepo, checkinAt)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo, ticketRepo)
			tx, err := usecase.CheckoutRentals(context.Background(), tt.rentalIds)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, tx.TransactionItems, 1)
				assert.Equal(t, float32(1), tx.TransactionItems[0].Amount)
				assert.Equal(t, tt.expectedPrice, tx.TransactionItems[0].Price)
				assert.Equal(t, tt.expectedPrice, tx.TransactionItems[0].Subtotal)
				if tt.expectedNote != nil {
					assert.Equal(t, *tt.expectedNote, tx.TransactionItems[0].Note)
				}
				if tt.expectedProductName != "" {
					assert.Equal(t, tt.expectedProductName, tx.TransactionItems[0].ProductName)
				}
			}
		})
	}
}
