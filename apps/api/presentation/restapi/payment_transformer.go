package restapi

import (
	"apps/api/data/doku"
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetPaymentCheckoutRequest(r *http.Request) (apiContract.PaymentCheckoutRequest, error) {
	var request apiContract.PaymentCheckoutRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func GetPartnerReferenceNo(r *http.Request) string {
	return mux.Vars(r)["partnerReferenceNo"]
}

func GetOrderAccessKey(r *http.Request) string {
	return r.Header.Get("X-Order-Access-Key")
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

func ToApiPayment(payment domain.Payment, transaction domain.Transaction, canCancel bool) apiContract.Payment {
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

	fulfillmentStatus := "preparing"
	if transaction.CompletedAt != nil {
		fulfillmentStatus = "ready"
	}

	var cancelReason *string
	if payment.CancelReason != nil {
		reason := string(*payment.CancelReason)
		cancelReason = &reason
	}

	return apiContract.Payment{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		Status:             string(payment.Status),
		Method:             string(payment.Method),
		Amount:             payment.Amount,
		QrContent:          payment.QrContent,
		ExpiredAt:          payment.ExpiredAt,
		CreatedAt:          payment.CreatedAt,
		PaidAt:             payment.PaidAt,
		CustomerName:       transaction.Name,
		TableLabel:         tableLabel,
		Items:              items,
		TransactionNumber:  transaction.TransactionNumber,
		FulfillmentStatus:  fulfillmentStatus,
		CanCancel:          canCancel,
		CancelReason:       cancelReason,
	}
}

func ToApiPaymentSummary(summary domain.PaymentSummary) apiContract.PaymentSummary {
	fulfillmentStatus := "preparing"
	if summary.CompletedAt != nil {
		fulfillmentStatus = "ready"
	}

	return apiContract.PaymentSummary{
		PartnerReferenceNo: summary.PartnerReferenceNo,
		Status:             string(summary.Status),
		Method:             string(summary.Method),
		FulfillmentStatus:  fulfillmentStatus,
		TransactionNumber:  summary.TransactionNumber,
		CustomerName:       summary.CustomerName,
		TableLabel:         summary.TableLabel,
		Amount:             summary.Amount,
		ItemCount:          int64(summary.ItemCount),
		CreatedAt:          summary.CreatedAt,
		PaidAt:             summary.PaidAt,
		DiningOption:       apiContract.DiningOption(summary.DiningOption),
	}
}
