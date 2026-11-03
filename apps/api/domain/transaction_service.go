package domain

import (
	"apps/api/utils"
	"context"
	"time"
)

type TransactionService struct {
	couponRepository  CouponRepository
	paymentRepository PaymentRepository
	cartRepository    CartRepository
	paymentService    PaymentService
}

func NewTransactionService(
	couponRepository CouponRepository,
	paymentRepository PaymentRepository,
	cartRepository CartRepository,
	paymentService PaymentService,
) TransactionService {
	return TransactionService{
		couponRepository:  couponRepository,
		paymentRepository: paymentRepository,
		cartRepository:    cartRepository,
		paymentService:    paymentService,
	}
}

func (service TransactionService) ApplyTransactionCoupons(ctx context.Context, transaction *Transaction, transactionId int64) *Error {
	itemIndexById := map[int64]int{}
	for index, item := range transaction.TransactionItems {
		itemIndexById[item.Id] = index
	}

	usedItemIds := map[int64]bool{}
	wholeBillCoupons := []Coupon{}

	for index, transactionCoupon := range transaction.TransactionCoupons {
		coupon, err := service.couponRepository.GetCouponById(ctx, transactionCoupon.CouponId)
		if err != nil {
			return err
		}

		if transactionCoupon.TransactionItemId == nil {
			wholeBillCoupons = append(wholeBillCoupons, coupon)
		} else {
			itemId := *transactionCoupon.TransactionItemId

			if usedItemIds[itemId] {
				return &Error{Type: BadRequest, Message: "only one coupon allowed per transaction item"}
			}
			usedItemIds[itemId] = true

			itemIndex, ok := itemIndexById[itemId]
			if !ok {
				return &Error{Type: BadRequest, Message: "transaction item not found for coupon"}
			}

			item := &transaction.TransactionItems[itemIndex]
			base := item.Price * item.Amount

			discount, err := service.applyCouponToBase(base, coupon)
			if err != nil {
				return err
			}

			newSubtotal := base - discount
			transaction.Total += newSubtotal - item.Subtotal
			item.DiscountAmount = discount
			item.Subtotal = newSubtotal
		}

		transaction.TransactionCoupons[index] = TransactionCoupon{
			Id:                transactionCoupon.Id,
			TransactionId:     transactionId,
			CouponId:          transactionCoupon.CouponId,
			Type:              coupon.Type,
			Amount:            coupon.Amount,
			TransactionItemId: transactionCoupon.TransactionItemId,
		}
	}

	for _, coupon := range wholeBillCoupons {
		discount, err := service.applyCouponToBase(transaction.Total, coupon)
		if err != nil {
			return err
		}
		transaction.Total -= discount
	}

	return nil
}

// settleOrderPayment closes FR-6: the guest's payments row, and cart, never moved when a
// staff member paid the linked order transaction by hand instead of through the gateway or
// the guest's own cash flow. payment is the row PayTransaction already locked with
// GetPaymentByTransactionIdForUpdate (D6); an already-paid one (the webhook won the race) is
// left alone.
func (service TransactionService) SettleOrderPayment(ctx context.Context, payment Payment) *Error {
	if payment.Status == PaymentStatePaid {
		return nil
	}

	now := time.Now()
	payment.Status = PaymentStatePaid
	payment.PaidAt = &now

	if _, err := service.paymentRepository.UpdatePaymentById(ctx, payment, payment.Id); err != nil {
		return err
	}

	cart, err := service.cartRepository.GetCartById(ctx, payment.CartId)
	if err != nil {
		return err
	}
	cart.Status = CartStatusConverted
	if _, err := service.cartRepository.UpdateCartById(ctx, cart, cart.Id); err != nil {
		return err
	}

	// D7/D8: the guest may have checked out again on this cart before the cashier settled this
	// (expired) order transaction by hand — finalise that newer attempt too, the same as a late
	// QRIS webhook does, so the cart never ends up with two paid orders.
	return service.paymentService.SupersedeLivePayments(ctx, payment.CartId, payment.Id)
}

func (service TransactionService) applyCouponToBase(base float32, coupon Coupon) (float32, *Error) {
	switch coupon.Type {
	case Fixed:
		d := float32(coupon.Amount)
		if d > base {
			d = base
		}
		return d, nil
	case Percentage:
		return float32(utils.RoundToNearest500(int(base) * int(coupon.Amount) / 100)), nil
	}
	return 0, &Error{Type: BadRequest, Message: "unsupported coupon type"}
}
