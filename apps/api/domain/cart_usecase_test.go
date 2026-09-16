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

func withCartTransaction(r *mock.MockCartRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func newCartUsecase(cartRepo *mock.MockCartRepository, variantRepo *mock.MockVariantRepository, tableRepo *mock.MockTableRepository, paymentRepo *mock.MockPaymentRepository) domain.CartUsecase {
	return domain.NewCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
}

func unlockedCart(pr *mock.MockPaymentRepository, cartId int64) {
	pr.EXPECT().GetPendingPaymentByCartId(gomock.Any(), cartId).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
}

func lockedCart(pr *mock.MockPaymentRepository, cartId int64) {
	pr.EXPECT().GetPendingPaymentByCartId(gomock.Any(), cartId).Return(domain.Payment{
		Id: 900, CartId: cartId, Status: domain.PaymentStatePending, ExpiredAt: time.Now().Add(5 * time.Minute),
	}, nil)
}

func expiredPendingCart(pr *mock.MockPaymentRepository, cartId int64) {
	pr.EXPECT().GetPendingPaymentByCartId(gomock.Any(), cartId).Return(domain.Payment{
		Id: 901, CartId: cartId, Status: domain.PaymentStatePending, ExpiredAt: time.Now().Add(-time.Minute),
	}, nil)
}

func publishedPurchaseVariant(id int64) domain.Variant {
	return domain.Variant{
		Id:          id,
		Price:       15000,
		IsAvailable: true,
		Product: domain.Product{
			Id:          1,
			Status:      domain.ProductStatusPublished,
			SaleType:    domain.SaleTypePurchase,
			IsAvailable: true,
		},
	}
}

func trackedVariant(id int64, productId int64, tracking domain.AvailabilityTracking, productQty *int, variantQty *int) domain.Variant {
	return domain.Variant{
		Id:                id,
		ProductId:         productId,
		Price:             15000,
		IsAvailable:       true,
		AvailableQuantity: variantQty,
		Product: domain.Product{
			Id:                   productId,
			Status:               domain.ProductStatusPublished,
			SaleType:             domain.SaleTypePurchase,
			IsAvailable:          true,
			AvailabilityTracking: tracking,
			AvailableQuantity:    productQty,
		},
	}
}

func TestCartUsecase_GetCurrentCart(t *testing.T) {
	tests := []struct {
		name             string
		sessionId        string
		setupMock        func(r *mock.MockCartRepository)
		expectedId       int64
		expectedItemsLen int
		expectedError    *domain.Error
	}{
		{
			name:      "returns existing active cart",
			sessionId: "session-1",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{
					Id:        1,
					SessionId: "session-1",
					Status:    domain.CartStatusActive,
					Items:     []domain.CartItem{{Id: 1, VariantId: 1, Amount: 2}},
				}, nil)
			},
			expectedId:       1,
			expectedItemsLen: 1,
		},
		{
			name:      "no cart yet returns empty cart, never 404",
			sessionId: "session-2",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
			},
			expectedId:       0,
			expectedItemsLen: 0,
		},
		{
			name:      "repository error",
			sessionId: "session-3",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-3").Return(domain.Cart{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			cart, err := usecase.GetCurrentCart(context.Background(), tt.sessionId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, cart.Id)
				assert.Len(t, cart.Items, tt.expectedItemsLen)
				assert.NotNil(t, cart.Items)
			}
		})
	}
}

func TestCartUsecase_UpdateCartTable(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		tableCode     string
		setupMock     func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository)
		expectedError *domain.Error
	}{
		{
			name:      "resolves code and attaches to existing active cart",
			sessionId: "session-1",
			tableCode: "0123456789",
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 5, Label: "Meja 1"}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{Id: 1, SessionId: "session-1", Status: domain.CartStatusActive}, nil)
				unlockedCart(pr, 1)
				cr.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-1", TableId: ptrInt64(5)}, nil)
			},
		},
		{
			name:      "creates the cart lazily on first write",
			sessionId: "session-2",
			tableCode: "0123456789",
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 5, Label: "Meja 1"}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
				cr.EXPECT().CreateCart(gomock.Any(), gomock.Any()).Return(domain.Cart{Id: 2, SessionId: "session-2", Status: domain.CartStatusActive}, nil)
				unlockedCart(pr, 2)
				cr.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Cart{Id: 2, SessionId: "session-2", TableId: ptrInt64(5)}, nil)
			},
		},
		{
			name:          "malformed code is rejected before touching the repo",
			sessionId:     "session-3",
			tableCode:     "not-a-code",
			setupMock:     func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "unknown code",
			sessionId: "session-4",
			tableCode: "ZZZZZZZZZZ",
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "ZZZZZZZZZZ").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:      "cart with a pending unexpired payment rejects the write (FR-7)",
			sessionId: "session-5",
			tableCode: "0123456789",
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 5, Label: "Meja 1"}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-5").Return(domain.Cart{Id: 1, SessionId: "session-5"}, nil)
				lockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "an expired pending payment does not lock the cart",
			sessionId: "session-6",
			tableCode: "0123456789",
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 5, Label: "Meja 1"}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-6").Return(domain.Cart{Id: 1, SessionId: "session-6"}, nil)
				expiredPendingCart(pr, 1)
				cr.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-6", TableId: ptrInt64(5)}, nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo, tableRepo, paymentRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			cart, err := usecase.UpdateCartTable(context.Background(), tt.sessionId, tt.tableCode)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, cart.TableId)
				assert.Equal(t, int64(5), *cart.TableId)
			}
		})
	}
}

func TestCartUsecase_AddCartItem(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		variantId     int64
		amount        float32
		note          string
		setupMock     func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository)
		expectedError *domain.Error
	}{
		{
			name:      "creates a new line when nothing matches",
			sessionId: "session-1",
			variantId: 10,
			amount:    2,
			note:      "less sugar",
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{Id: 1, SessionId: "session-1"}, nil)
				unlockedCart(pr, 1)
				cr.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 100, VariantId: 10, Amount: 2, Note: "less sugar"}, nil)
				cr.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-1", Items: []domain.CartItem{{Id: 100, VariantId: 10, Amount: 2, Note: "less sugar"}}}, nil)
			},
		},
		{
			name:      "creates the cart lazily on first write",
			sessionId: "session-2",
			variantId: 10,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
				cr.EXPECT().CreateCart(gomock.Any(), gomock.Any()).Return(domain.Cart{Id: 3, SessionId: "session-2"}, nil)
				unlockedCart(pr, 3)
				cr.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 101, VariantId: 10, Amount: 1}, nil)
				cr.EXPECT().GetCartById(gomock.Any(), int64(3)).Return(domain.Cart{Id: 3, SessionId: "session-2", Items: []domain.CartItem{{Id: 101, VariantId: 10, Amount: 1}}}, nil)
			},
		},
		{
			name:      "merges into an identical existing line (D9)",
			sessionId: "session-3",
			variantId: 10,
			amount:    1,
			note:      "less sugar",
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-3").Return(domain.Cart{
					Id: 1, SessionId: "session-3",
					Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 2, Note: "less sugar"}},
				}, nil)
				unlockedCart(pr, 1)
				cr.EXPECT().UpdateCartItemById(gomock.Any(), gomock.Any(), int64(50)).DoAndReturn(
					func(ctx context.Context, item domain.CartItem, id int64) (domain.CartItem, *domain.Error) {
						assert.Equal(t, float32(3), item.Amount)
						return domain.CartItem{Id: 50, VariantId: 10, Amount: 3, Note: "less sugar"}, nil
					})
				cr.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-3", Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 3, Note: "less sugar"}}}, nil)
			},
		},
		{
			name:      "different note stays a separate line (D9)",
			sessionId: "session-4",
			variantId: 10,
			amount:    1,
			note:      "extra ice",
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-4").Return(domain.Cart{
					Id: 1, SessionId: "session-4",
					Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 2, Note: "less sugar"}},
				}, nil)
				unlockedCart(pr, 1)
				cr.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 51, VariantId: 10, Amount: 1, Note: "extra ice"}, nil)
				cr.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-4"}, nil)
			},
		},
		{
			name:          "amount must be a positive integer",
			sessionId:     "session-5",
			variantId:     10,
			amount:        0.5,
			setupMock:     func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "amount below 1 is rejected",
			sessionId:     "session-6",
			variantId:     10,
			amount:        0,
			setupMock:     func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "draft product is rejected",
			sessionId: "session-7",
			variantId: 11,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(11)).Return(domain.Variant{
					Id: 11, Product: domain.Product{Status: domain.ProductStatusDraft, SaleType: domain.SaleTypePurchase},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "rental product is rejected",
			sessionId: "session-8",
			variantId: 12,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(12)).Return(domain.Variant{
					Id: 12, Product: domain.Product{Status: domain.ProductStatusPublished, SaleType: domain.SaleTypeRental},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "unknown variant",
			sessionId: "session-9",
			variantId: 999,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(999)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:      "cart with a pending unexpired payment rejects the write (FR-7)",
			sessionId: "session-10",
			variantId: 10,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-10").Return(domain.Cart{Id: 1, SessionId: "session-10"}, nil)
				lockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "an expired pending payment does not lock the cart",
			sessionId: "session-11",
			variantId: 10,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(publishedPurchaseVariant(10), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-11").Return(domain.Cart{Id: 1, SessionId: "session-11"}, nil)
				expiredPendingCart(pr, 1)
				cr.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 102, VariantId: 10, Amount: 1}, nil)
				cr.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: "session-11", Items: []domain.CartItem{{Id: 102, VariantId: 10, Amount: 1}}}, nil)
			},
		},
		{
			name:      "a sold-out variant is rejected (FR-7)",
			sessionId: "session-12",
			variantId: 20,
			amount:    1,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				variant := trackedVariant(20, 2, domain.AvailabilityTrackingNone, nil, nil)
				variant.IsAvailable = false
				vr.EXPECT().GetVariantById(gomock.Any(), int64(20)).Return(variant, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "requesting more than a 3-count variant is rejected",
			sessionId: "session-13",
			variantId: 21,
			amount:    4,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(21)).Return(trackedVariant(21, 3, domain.AvailabilityTrackingVariant, nil, intPtr(3)), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-13").Return(domain.Cart{Id: 1, SessionId: "session-13"}, nil)
				unlockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "a second variant sharing a product-level counter is rejected once the total exceeds it",
			sessionId: "session-14",
			variantId: 31,
			amount:    3,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(31)).Return(trackedVariant(31, 4, domain.AvailabilityTrackingProduct, intPtr(5), nil), nil)
				existingVariant := trackedVariant(30, 4, domain.AvailabilityTrackingProduct, intPtr(5), nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-14").Return(domain.Cart{
					Id: 1, SessionId: "session-14",
					Items: []domain.CartItem{{Id: 60, VariantId: 30, Amount: 3, Variant: existingVariant}},
				}, nil)
				unlockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo, variantRepo, paymentRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			_, err := usecase.AddCartItem(context.Background(), tt.sessionId, tt.variantId, tt.amount, tt.note)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestCartUsecase_AddCartItem_CountingUnitAcrossCalls(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	cartRepo := mock.NewMockCartRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	tableRepo := mock.NewMockTableRepository(ctrl)
	paymentRepo := mock.NewMockPaymentRepository(ctrl)
	usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)

	variant := trackedVariant(40, 5, domain.AvailabilityTrackingVariant, nil, intPtr(3))

	withCartTransaction(cartRepo)
	variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(40)).Return(variant, nil)
	cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{Id: 1, SessionId: "session-1"}, nil)
	unlockedCart(paymentRepo, 1)
	cartRepo.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 200, VariantId: 40, Amount: 2, Variant: variant}, nil)
	cartRepo.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{
		Id: 1, SessionId: "session-1", Items: []domain.CartItem{{Id: 200, VariantId: 40, Amount: 2, Variant: variant}},
	}, nil)

	_, err := usecase.AddCartItem(context.Background(), "session-1", 40, 2, "")
	assert.Nil(t, err)

	withCartTransaction(cartRepo)
	variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(40)).Return(variant, nil)
	cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{
		Id: 1, SessionId: "session-1", Items: []domain.CartItem{{Id: 200, VariantId: 40, Amount: 2, Variant: variant}},
	}, nil)
	unlockedCart(paymentRepo, 1)

	_, err = usecase.AddCartItem(context.Background(), "session-1", 40, 2, "")
	assert.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}

func TestCartUsecase_UpdateCartItem(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		cartItemId    int64
		amount        float32
		note          string
		setupMock     func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository)
		expectedError *domain.Error
	}{
		{
			name:       "updates a line that belongs to the session's cart",
			sessionId:  "session-1",
			cartItemId: 50,
			amount:     3,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				unlockedCart(pr, 1)
				r.EXPECT().UpdateCartItemById(gomock.Any(), gomock.Any(), int64(50)).Return(domain.CartItem{Id: 50, Amount: 3}, nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50, Amount: 3}}}, nil)
			},
		},
		{
			name:       "item from a different session's cart is not found",
			sessionId:  "session-2",
			cartItemId: 999,
			amount:     1,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:       "no cart at all for this session",
			sessionId:  "session-3",
			cartItemId: 50,
			amount:     1,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-3").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:          "amount must be a positive integer",
			sessionId:     "session-4",
			cartItemId:    50,
			amount:        -1,
			setupMock:     func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "cart with a pending unexpired payment rejects the write (FR-7)",
			sessionId:  "session-5",
			cartItemId: 50,
			amount:     3,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-5").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				lockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "an expired pending payment does not lock the cart",
			sessionId:  "session-6",
			cartItemId: 50,
			amount:     3,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-6").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				expiredPendingCart(pr, 1)
				r.EXPECT().UpdateCartItemById(gomock.Any(), gomock.Any(), int64(50)).Return(domain.CartItem{Id: 50, Amount: 3}, nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50, Amount: 3}}}, nil)
			},
		},
		{
			name:       "raising a variant-level line past what's left counting the cart's other lines is rejected (FR-7)",
			sessionId:  "session-7",
			cartItemId: 50,
			amount:     3,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				variant := trackedVariant(41, 6, domain.AvailabilityTrackingVariant, nil, intPtr(3))
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-7").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{
						{Id: 50, VariantId: 41, Amount: 1, Variant: variant},
						{Id: 51, VariantId: 41, Amount: 1, Note: "extra ice", Variant: variant},
					},
				}, nil)
				unlockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo, paymentRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			_, err := usecase.UpdateCartItem(context.Background(), tt.sessionId, tt.cartItemId, tt.amount, tt.note)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestCartUsecase_RemoveCartItem(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		cartItemId    int64
		setupMock     func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository)
		expectedError *domain.Error
	}{
		{
			name:       "removes a line that belongs to the session's cart",
			sessionId:  "session-1",
			cartItemId: 50,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				unlockedCart(pr, 1)
				r.EXPECT().DeleteCartItemById(gomock.Any(), int64(50)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
		},
		{
			name:       "item from a different session's cart is not found",
			sessionId:  "session-2",
			cartItemId: 999,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:       "cart with a pending unexpired payment rejects the write (FR-7)",
			sessionId:  "session-3",
			cartItemId: 50,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-3").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				lockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "an expired pending payment does not lock the cart",
			sessionId:  "session-4",
			cartItemId: 50,
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				withCartTransaction(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-4").Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				expiredPendingCart(pr, 1)
				r.EXPECT().DeleteCartItemById(gomock.Any(), int64(50)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo, paymentRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			_, err := usecase.RemoveCartItem(context.Background(), tt.sessionId, tt.cartItemId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestCartUsecase_ClearCart(t *testing.T) {
	tests := []struct {
		name             string
		sessionId        string
		setupMock        func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository)
		expectedItemsLen int
		expectedError    *domain.Error
	}{
		{
			name:      "empties an existing active cart",
			sessionId: "session-1",
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50}}}, nil)
				unlockedCart(pr, 1)
				r.EXPECT().DeleteCartItemsByCartId(gomock.Any(), int64(1)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
			expectedItemsLen: 0,
		},
		{
			name:      "no cart yet resolves to an empty cart",
			sessionId: "session-2",
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-2").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
			},
			expectedItemsLen: 0,
		},
		{
			name:      "repository error",
			sessionId: "session-3",
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-3").Return(domain.Cart{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name:      "cart with a pending unexpired payment rejects the write (FR-7)",
			sessionId: "session-4",
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-4").Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50}}}, nil)
				lockedCart(pr, 1)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "an expired pending payment does not lock the cart",
			sessionId: "session-5",
			setupMock: func(r *mock.MockCartRepository, pr *mock.MockPaymentRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-5").Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50}}}, nil)
				expiredPendingCart(pr, 1)
				r.EXPECT().DeleteCartItemsByCartId(gomock.Any(), int64(1)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
			expectedItemsLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			tt.setupMock(cartRepo, paymentRepo)

			usecase := newCartUsecase(cartRepo, variantRepo, tableRepo, paymentRepo)
			cart, err := usecase.ClearCart(context.Background(), tt.sessionId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, cart.Items, tt.expectedItemsLen)
			}
		})
	}
}
