package mysql

import "apps/api/domain"

func ToPaymentVerificationPhotoDB(d domain.PaymentVerificationPhoto) PaymentVerificationPhoto {
	return PaymentVerificationPhoto{
		PaymentId:   d.PaymentId,
		ContentType: d.ContentType,
		ByteSize:    d.ByteSize,
		Data:        d.Data,
		CreatedAt:   d.CreatedAt,
	}
}

func ToPaymentVerificationPhotoDomain(db PaymentVerificationPhoto) domain.PaymentVerificationPhoto {
	return domain.PaymentVerificationPhoto{
		PaymentId:   db.PaymentId,
		ContentType: db.ContentType,
		ByteSize:    db.ByteSize,
		Data:        db.Data,
		CreatedAt:   db.CreatedAt,
	}
}
