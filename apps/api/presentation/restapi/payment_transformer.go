package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

func GetPaymentCheckoutRequest(r *http.Request) (apiContract.PaymentCheckoutRequest, error) {
	var request apiContract.PaymentCheckoutRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

// ToApiPayment assembles the Payment response from the payment row and the
// order transaction it pays for. customerName and items are read off the
// transaction rather than the payment (FR-6, D9): both are frozen at
// checkout, and the transaction is where that freeze already lives —
// payment_entity.go deliberately carries no copy of its own. tableLabel
// comes from the transaction's cart, preloaded by
// TransactionRepository.GetTransactionById / CreateTransaction the same way
// ToApiTransaction reads it.
func ToApiPayment(payment domain.Payment, transaction domain.Transaction) apiContract.Payment {
	items := []apiContract.PaymentItem{}
	for _, item := range transaction.TransactionItems {
		options := []apiContract.PaymentItemOption{}
		for _, value := range item.Values {
			options = append(options, apiContract.PaymentItemOption{
				Name:  value.OptionName,
				Value: value.OptionValueName,
			})
		}

		items = append(items, apiContract.PaymentItem{
			Name:     item.ProductName,
			Amount:   item.Amount,
			Price:    item.Price,
			Subtotal: item.Subtotal,
			Note:     item.Note,
			Options:  options,
		})
	}

	var tableLabel string
	if transaction.Cart != nil && transaction.Cart.Table != nil {
		tableLabel = transaction.Cart.Table.Label
	}

	return apiContract.Payment{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		Status:             string(payment.Status),
		Amount:             payment.Amount,
		QrContent:          payment.QrContent,
		ExpiredAt:          payment.ExpiredAt,
		PaidAt:             payment.PaidAt,
		CustomerName:       transaction.Name,
		TableLabel:         tableLabel,
		Items:              items,
	}
}
