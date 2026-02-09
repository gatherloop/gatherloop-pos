package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetTransactionId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTransactionRequest(r *http.Request) (apiContract.TransactionRequest, error) {
	var transactionRequest apiContract.TransactionRequest
	err := json.NewDecoder(r.Body).Decode(&transactionRequest)
	return transactionRequest, err
}

func GetTransactionPayRequest(r *http.Request) (apiContract.TransactionPayRequest, error) {
	var transactionPayRequest apiContract.TransactionPayRequest
	err := json.NewDecoder(r.Body).Decode(&transactionPayRequest)
	return transactionPayRequest, err
}

func GetPaymentStatus(r *http.Request) domain.PaymentStatus {
	paymentStatusQuery := r.URL.Query().Get("paymentStatus")
	switch paymentStatusQuery {
	case "paid":
		return domain.Paid
	case "unpaid":
		return domain.Unpaid
	case "all":
		return domain.All
	default:
		return domain.All
	}
}

func ToApiTransaction(transaction domain.Transaction) apiContract.Transaction {
	apiTransactionItems := []apiContract.TransactionItem{}
	for _, item := range transaction.TransactionItems {
		apiTransactionItems = append(apiTransactionItems, apiContract.TransactionItem{
			Id:             item.Id,
			TransactionId:  item.TransactionId,
			VariantId:      item.VariantId,
			Variant:        ToApiVariant(item.Variant),
			Amount:         item.Amount,
			Price:          item.Price,
			DiscountAmount: item.DiscountAmount,
			Subtotal:       item.Subtotal,
			Note:           item.Note,
		})
	}

	apiTransactionCoupons := []apiContract.TransactionCoupon{}
	for _, transactionCoupon := range transaction.TransactionCoupons {
		apiTransactionCoupons = append(apiTransactionCoupons, apiContract.TransactionCoupon{
			Id:            transactionCoupon.Id,
			CouponId:      transactionCoupon.CouponId,
			Coupon:        ToApiCoupon(transactionCoupon.Coupon),
			Type:          string(transactionCoupon.Type),
			Amount:        transactionCoupon.Amount,
			TransactionId: transactionCoupon.TransactionId,
		})
	}

	return apiContract.Transaction{
		Id:                 transaction.Id,
		Name:               transaction.Name,
		OrderNumber:        transaction.OrderNumber,
		DeletedAt:          transaction.DeletedAt,
		CreatedAt:          transaction.CreatedAt,
		WalletId:           transaction.WalletId,
		Wallet:             (*apiContract.Wallet)(transaction.Wallet),
		Total:              transaction.Total,
		TotalIncome:        transaction.TotalIncome,
		PaidAt:             transaction.PaidAt,
		PaidAmount:         transaction.PaidAmount,
		TransactionItems:   apiTransactionItems,
		TransactionCoupons: apiTransactionCoupons,
	}
}

func ToTransaction(transactionRequest apiContract.TransactionRequest) domain.Transaction {
	transactionItems := []domain.TransactionItem{}
	for _, item := range transactionRequest.TransactionItems {
		var id int64
		if item.Id != nil {
			id = *item.Id
		}
		transactionItems = append(transactionItems, domain.TransactionItem{
			Id:             id,
			VariantId:      item.VariantId,
			Amount:         item.Amount,
			DiscountAmount: item.DiscountAmount,
			Note:           item.Note,
		})
	}

	transactionCoupons := []domain.TransactionCoupon{}
	for _, transactionCoupon := range transactionRequest.TransactionCoupons {
		var id int64
		if transactionCoupon.Id != nil {
			id = *transactionCoupon.Id
		}
		transactionCoupons = append(transactionCoupons, domain.TransactionCoupon{
			Id:       id,
			CouponId: transactionCoupon.CouponId,
		})
	}

	return domain.Transaction{
		Name:               transactionRequest.Name,
		OrderNumber:        transactionRequest.OrderNumber,
		TransactionItems:   transactionItems,
		TransactionCoupons: transactionCoupons,
	}
}

func ToApiTransactionStatistic(transactionStatistic domain.TransactionStatistic) apiContract.TransactionStatistic {
	return apiContract.TransactionStatistic{
		Date:        transactionStatistic.Date,
		Total:       transactionStatistic.Total,
		TotalIncome: transactionStatistic.TotalIncome,
	}
}
