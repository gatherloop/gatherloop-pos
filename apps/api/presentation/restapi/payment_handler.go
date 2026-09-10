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

// Notification handles DOKU's inbound QRIS payment notification (FR-6, D19).
// VerifyDokuSignature has already checked its signature by the time this
// runs, so the only trust decision left here is none — everything from here
// down is ConfirmPayment applying FR-6's steps 2-6 and this handler logging
// and responding to whatever it resolved to.
//
// Every outcome the usecase reports gets a 200 (D14/FR-6 step 6); only a
// genuine system error — the usecase's own DB write failing — is answered
// with anything else, so DOKU retries exactly the cases retrying can fix.
func (handler PaymentHandler) Notification(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.FromCtx(ctx, slog.Default())

	body, readErr := io.ReadAll(r.Body)
	if readErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: "failed to read request body"})
		return
	}

	payment, outcome, usecaseErr := handler.usecase.ConfirmPayment(ctx, body)
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
