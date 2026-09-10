package mysql

import "apps/api/domain"

func ToPaymentDB(d domain.Payment) Payment {
	var qrContent *string
	if d.QrContent != "" {
		content := d.QrContent
		qrContent = &content
	}

	return Payment{
		Id:                 d.Id,
		CartId:             d.CartId,
		SessionId:          d.SessionId,
		TransactionId:      d.TransactionId,
		PartnerReferenceNo: d.PartnerReferenceNo,
		GatewayReferenceNo: d.GatewayReferenceNo,
		Method:             string(d.Method),
		Status:             string(d.Status),
		Amount:             d.Amount,
		QrContent:          qrContent,
		ExpiredAt:          d.ExpiredAt,
		PaidAt:             d.PaidAt,
		StatusCheckedAt:    d.StatusCheckedAt,
		CreatedAt:          d.CreatedAt,
		UpdatedAt:          d.UpdatedAt,
		DeletedAt:          d.DeletedAt,
	}
}

func ToPaymentDomain(db Payment) domain.Payment {
	qrContent := ""
	if db.QrContent != nil {
		qrContent = *db.QrContent
	}

	return domain.Payment{
		Id:                 db.Id,
		CartId:             db.CartId,
		SessionId:          db.SessionId,
		TransactionId:      db.TransactionId,
		PartnerReferenceNo: db.PartnerReferenceNo,
		GatewayReferenceNo: db.GatewayReferenceNo,
		Method:             domain.PaymentMethod(db.Method),
		Status:             domain.PaymentState(db.Status),
		Amount:             db.Amount,
		QrContent:          qrContent,
		ExpiredAt:          db.ExpiredAt,
		PaidAt:             db.PaidAt,
		StatusCheckedAt:    db.StatusCheckedAt,
		CreatedAt:          db.CreatedAt,
		UpdatedAt:          db.UpdatedAt,
		DeletedAt:          db.DeletedAt,
	}
}
