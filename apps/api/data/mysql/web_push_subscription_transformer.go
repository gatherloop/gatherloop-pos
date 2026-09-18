package mysql

import "apps/api/domain"

func ToWebPushSubscriptionDB(domainSubscription domain.WebPushSubscription) WebPushSubscription {
	return WebPushSubscription{
		Id:         domainSubscription.Id,
		SessionId:  domainSubscription.SessionId,
		Endpoint:   domainSubscription.Endpoint,
		P256dhKey:  domainSubscription.P256dhKey,
		AuthKey:    domainSubscription.AuthKey,
		UserAgent:  domainSubscription.UserAgent,
		CreatedAt:  domainSubscription.CreatedAt,
		LastSeenAt: domainSubscription.LastSeenAt,
		DeletedAt:  domainSubscription.DeletedAt,
	}
}

func ToWebPushSubscriptionDomain(dbSubscription WebPushSubscription) domain.WebPushSubscription {
	return domain.WebPushSubscription{
		Id:         dbSubscription.Id,
		SessionId:  dbSubscription.SessionId,
		Endpoint:   dbSubscription.Endpoint,
		P256dhKey:  dbSubscription.P256dhKey,
		AuthKey:    dbSubscription.AuthKey,
		UserAgent:  dbSubscription.UserAgent,
		CreatedAt:  dbSubscription.CreatedAt,
		LastSeenAt: dbSubscription.LastSeenAt,
		DeletedAt:  dbSubscription.DeletedAt,
	}
}

func ToWebPushSubscriptionsListDomain(dbSubscriptions []WebPushSubscription) []domain.WebPushSubscription {
	var domainSubscriptions []domain.WebPushSubscription
	for _, dbSubscription := range dbSubscriptions {
		domainSubscriptions = append(domainSubscriptions, ToWebPushSubscriptionDomain(dbSubscription))
	}
	return domainSubscriptions
}
