package mysql

import "apps/api/domain"

func ToGuestNotificationDomain(dbNotification GuestNotification) domain.GuestNotification {
	return domain.GuestNotification{
		Id:            dbNotification.Id,
		TransactionId: dbNotification.TransactionId,
		SessionId:     dbNotification.SessionId,
		Status:        domain.GuestNotificationStatus(dbNotification.Status),
		AttemptCount:  dbNotification.AttemptCount,
		ClaimedAt:     dbNotification.ClaimedAt,
		Detail:        dbNotification.Detail,
		CreatedAt:     dbNotification.CreatedAt,
		SentAt:        dbNotification.SentAt,
	}
}

func ToGuestNotificationsListDomain(dbNotifications []GuestNotification) []domain.GuestNotification {
	var domainNotifications []domain.GuestNotification
	for _, dbNotification := range dbNotifications {
		domainNotifications = append(domainNotifications, ToGuestNotificationDomain(dbNotification))
	}
	return domainNotifications
}
