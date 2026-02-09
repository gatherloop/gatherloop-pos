package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type CouponHandler struct {
	usecase domain.CouponUsecase
}

func NewCouponHandler(usecase domain.CouponUsecase) CouponHandler {
	return CouponHandler{usecase: usecase}
}

func (handler CouponHandler) GetCouponList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	coupons, err := handler.usecase.GetCouponList(ctx)
	if err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiCoupons := []apiContract.Coupon{}
	for _, coupon := range coupons {
		apiCoupons = append(apiCoupons, ToApiCoupon(coupon))
	}

	WriteResponse(w, apiContract.CouponList200Response{Data: apiCoupons})
}

func (handler CouponHandler) GetCouponById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCouponId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	coupon, baseError := handler.usecase.GetCouponById(ctx, id)
	if baseError != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(baseError.Type), Message: baseError.Message})
		return
	}

	WriteResponse(w, apiContract.CouponFindById200Response{Data: ToApiCoupon(coupon)})
}

func (handler CouponHandler) CreateCoupon(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	couponRequest, err := GetCouponRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCoupon(ctx, ToCoupon(couponRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CouponHandler) UpdateCouponById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCouponId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	couponRequest, err := GetCouponRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCouponById(ctx, ToCoupon(couponRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CouponHandler) DeleteCouponById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCouponId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCouponById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
