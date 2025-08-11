package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type CouponRouter struct {
	handler CouponHandler
}

func NewCouponRouter(handler CouponHandler) CouponRouter {
	return CouponRouter{handler: handler}
}

func (couponRouter CouponRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/coupons", CheckAuth(couponRouter.handler.GetCouponList)).Methods(http.MethodGet)
	router.HandleFunc("/coupons/{couponId}", CheckAuth(couponRouter.handler.GetCouponById)).Methods(http.MethodGet)
	router.HandleFunc("/coupons/{couponId}", CheckAuth(couponRouter.handler.DeleteCouponById)).Methods(http.MethodDelete)
	router.HandleFunc("/coupons/{couponId}", CheckAuth(couponRouter.handler.UpdateCouponById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/coupons", CheckAuth(couponRouter.handler.CreateCoupon)).Methods(http.MethodPost, http.MethodOptions)
}
