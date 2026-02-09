package restapi

import (
	"apps/api/domain/coupon"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetCouponId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["couponId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCouponRequest(r *http.Request) (apiContract.CouponRequest, error) {
	var couponRequest apiContract.CouponRequest
	err := json.NewDecoder(r.Body).Decode(&couponRequest)
	return couponRequest, err
}

func ToApiCoupon(coupon coupon.Coupon) apiContract.Coupon {
	return apiContract.Coupon{
		Id:        coupon.Id,
		Code:      coupon.Code,
		Type:      string(coupon.Type),
		Amount:    coupon.Amount,
		CreatedAt: coupon.CreatedAt,
		DeletedAt: coupon.DeletedAt,
	}
}

func ToCoupon(couponRequest apiContract.CouponRequest) coupon.Coupon {
	return coupon.Coupon{
		Code:   couponRequest.Code,
		Type:   coupon.CouponType(couponRequest.Type),
		Amount: couponRequest.Amount,
	}
}
