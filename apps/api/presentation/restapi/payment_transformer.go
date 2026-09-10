package restapi

import (
	"apps/api/data/doku"
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"
)

func GetPaymentCheckoutRequest(r *http.Request) (apiContract.PaymentCheckoutRequest, error) {
	var request apiContract.PaymentCheckoutRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func GetDokuNotificationRequest(body []byte) (apiContract.DokuNotificationRequest, error) {
	var request apiContract.DokuNotificationRequest
	err := json.Unmarshal(body, &request)
	return request, err
}

func ToQrisStatus(request apiContract.DokuNotificationRequest) domain.QrisStatus {
	paidAmount, _ := strconv.ParseFloat(request.Amount.Value, 32)

	return domain.QrisStatus{
		PartnerReferenceNo: request.OriginalPartnerReferenceNo,
		GatewayReferenceNo: request.OriginalReferenceNo,
		Status:             doku.MapTransactionStatus(request.LatestTransactionStatus),
		PaidAmount:         float32(paidAmount),
		RawStatusCode:      request.LatestTransactionStatus,
	}
}

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
