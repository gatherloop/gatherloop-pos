package restapi

import (
	"apps/api/domain"
	"apps/api/utils/logger"
	"context"
	apiContract "libs/api-contract"
	"log/slog"
	"net/http"
)

type CartHandler struct {
	usecase domain.CartUsecase
}

func NewCartHandler(usecase domain.CartUsecase) CartHandler {
	return CartHandler{usecase: usecase}
}

func (handler CartHandler) GetCurrentCart(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	cart, err := handler.usecase.GetCurrentCart(ctx, sessionId)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func (handler CartHandler) UpdateCartTable(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetCartUpdateTableRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	cart, usecaseErr := handler.usecase.UpdateCartTable(ctx, sessionId, request.TableCode)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	logCartMutation(ctx, "cart table updated", sessionId, cart.TableId)

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func (handler CartHandler) AddCartItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetCartItemCreateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	cart, usecaseErr := handler.usecase.AddCartItem(ctx, sessionId, request.VariantId, float32(request.Amount), noteOrEmpty(request.Note))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	logCartMutation(ctx, "cart item added", sessionId, cart.TableId)

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func (handler CartHandler) UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	cartItemId, err := GetCartItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	request, err := GetCartItemUpdateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	cart, usecaseErr := handler.usecase.UpdateCartItem(ctx, sessionId, cartItemId, float32(request.Amount), noteOrEmpty(request.Note))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	logCartMutation(ctx, "cart item updated", sessionId, cart.TableId)

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func (handler CartHandler) RemoveCartItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	cartItemId, err := GetCartItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	cart, usecaseErr := handler.usecase.RemoveCartItem(ctx, sessionId, cartItemId)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	logCartMutation(ctx, "cart item removed", sessionId, cart.TableId)

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func (handler CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	cart, usecaseErr := handler.usecase.ClearCart(ctx, sessionId)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	logCartMutation(ctx, "cart cleared", sessionId, cart.TableId)

	WriteResponse(w, apiContract.CartResponse{Data: ToApiCart(cart)})
}

func noteOrEmpty(note *string) string {
	if note == nil {
		return ""
	}
	return *note
}

func logCartMutation(ctx context.Context, message string, sessionId string, tableId *int64) {
	log := logger.FromCtx(ctx, slog.Default())

	attrs := []any{slog.String("session_id", sessionId)}
	if tableId != nil {
		attrs = append(attrs, slog.Int64("table_id", *tableId))
	}

	log.InfoContext(ctx, message, attrs...)
}
