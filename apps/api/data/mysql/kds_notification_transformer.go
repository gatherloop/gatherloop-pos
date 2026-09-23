package mysql

import "apps/api/domain"

func ToKdsNotificationDomain(dbNotification KdsNotification) domain.KdsNotification {
	return domain.KdsNotification{
		Id:            dbNotification.Id,
		TransactionId: dbNotification.TransactionId,
		Kind:          domain.KdsNotificationKind(dbNotification.Kind),
		Status:        domain.KdsNotificationStatus(dbNotification.Status),
		AttemptCount:  dbNotification.AttemptCount,
		Detail:        dbNotification.Detail,
		CreatedAt:     dbNotification.CreatedAt,
		SentAt:        dbNotification.SentAt,
	}
}

func ToKdsNotificationsListDomain(dbNotifications []KdsNotification) []domain.KdsNotification {
	var domainNotifications []domain.KdsNotification
	for _, dbNotification := range dbNotifications {
		domainNotifications = append(domainNotifications, ToKdsNotificationDomain(dbNotification))
	}
	return domainNotifications
}
