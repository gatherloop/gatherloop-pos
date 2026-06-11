package domain

import "apps/api/utils"

func ApplyCouponToBase(base float32, coupon Coupon) (float32, *Error) {
	switch coupon.Type {
	case Fixed:
		d := float32(coupon.Amount)
		if d > base {
			d = base
		}
		return d, nil
	case Percentage:
		return float32(utils.RoundToNearest500(int(base) * int(coupon.Amount) / 100)), nil
	}
	return 0, &Error{Type: BadRequest, Message: "unsupported coupon type"}
}
