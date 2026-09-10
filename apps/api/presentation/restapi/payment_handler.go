package restapi

import (
	"apps/api/domain"
	"apps/api/utils/logger"
	"io"
	apiContract "libs/api-contract"
	"log/slog"
	"net/http"
)

type PaymentHandler struct {
	usecase domain.PaymentUsecase
}

func NewPaymentHandler(usecase domain.PaymentUsecase) PaymentHandler {
	return PaymentHandler{usecase: usecase}
}

func (handler PaymentHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetPaymentCheckoutRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	payment, transaction, usecaseErr := handler.usecase.Checkout(ctx, sessionId, request.CustomerName)
	if usecaseErr != nil {
		apiError := apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message}
		if usecaseErr.Type == domain.BadGateway {
			WriteErrorWithStatus(ctx, w, apiError, http.StatusBadGateway)
			return
		}
		WriteError(ctx, w, apiError)
		return
	}

	WriteResponse(w, apiContract.PaymentResponse{Data: ToApiPayment(payment, transaction)})
}

func (handler PaymentHandler) GetPaymentByPartnerReferenceNo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	partnerReferenceNo := GetPartnerReferenceNo(r)

	payment, transaction, usecaseErr := handler.usecase.GetPaymentStatus(ctx, sessionId, partnerReferenceNo)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.PaymentResponse{Data: ToApiPayment(payment, transaction)})
}

func (handler PaymentHandler) Notification(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.FromCtx(ctx, slog.Default())

	body, readErr := io.ReadAll(r.Body)
	if readErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: "failed to read request body"})
		return
	}

	request, parseErr := GetDokuNotificationRequest(body)
	if parseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: parseErr.Error()})
		return
	}
	status := ToQrisStatus(request)

	payment, outcome, usecaseErr := handler.usecase.ConfirmPayment(ctx, status)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	switch outcome {
	case domain.ConfirmPaymentOutcomeUnknownReference:
		log.WarnContext(ctx, "doku notification for an unknown payment reference")
	case domain.ConfirmPaymentOutcomePaidLate:
		log.WarnContext(ctx, "doku notification paid a payment our own expiry had already given up on",
			slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
		)
	case domain.ConfirmPaymentOutcomeAmountMismatch:
		log.ErrorContext(ctx, "doku notification amount does not match the payment on record",
			slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
		)
	case domain.ConfirmPaymentOutcomePaid, domain.ConfirmPaymentOutcomeExpired, domain.ConfirmPaymentOutcomeFailed:
		log.InfoContext(ctx, "doku notification applied",
			slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
			slog.String("outcome", string(outcome)),
		)
	default:
		log.InfoContext(ctx, "doku notification was a no-op",
			slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
			slog.String("outcome", string(outcome)),
		)
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
