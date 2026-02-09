package mysql

import "apps/api/domain"

func ToCouponDB(domainCoupon domain.Coupon) Coupon {
	return Coupon{
		Id:        domainCoupon.Id,
		Code:      domainCoupon.Code,
		Type:      string(domainCoupon.Type),
		Amount:    domainCoupon.Amount,
		DeletedAt: domainCoupon.DeletedAt,
		CreatedAt: domainCoupon.CreatedAt,
	}
}

func ToCouponDomain(dbCoupon Coupon) domain.Coupon {
	return domain.Coupon{
		Id:        dbCoupon.Id,
		Code:      dbCoupon.Code,
		Type:      domain.CouponType(dbCoupon.Type),
		Amount:    dbCoupon.Amount,
		DeletedAt: dbCoupon.DeletedAt,
		CreatedAt: dbCoupon.CreatedAt,
	}
}

func ToCouponListDomain(dbCoupons []Coupon) []domain.Coupon {
	var domainCoupons []domain.Coupon
	for _, dbCoupon := range dbCoupons {
		domainCoupons = append(domainCoupons, ToCouponDomain(dbCoupon))
	}
	return domainCoupons
}
