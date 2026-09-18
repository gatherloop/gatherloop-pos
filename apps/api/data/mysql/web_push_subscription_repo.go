package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewWebPushSubscriptionRepository(db *gorm.DB) domain.WebPushSubscriptionRepository {
	return Repository{db: db}
}

func (repo Repository) SubscribeWebPush(ctx context.Context, subscription domain.WebPushSubscription) (domain.WebPushSubscription, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	now := time.Now()
	payload := WebPushSubscription{
		SessionId:  subscription.SessionId,
		Endpoint:   subscription.Endpoint,
		P256dhKey:  subscription.P256dhKey,
		AuthKey:    subscription.AuthKey,
		UserAgent:  subscription.UserAgent,
		LastSeenAt: &now,
	}

	result := db.Table("web_push_subscriptions").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "endpoint"}},
			DoUpdates: clause.AssignmentColumns([]string{"session_id", "p256dh_key", "auth_key", "user_agent", "last_seen_at", "deleted_at"}),
		}).
		Create(&payload)
	if result.Error != nil {
		return domain.WebPushSubscription{}, ToErrorCtx(ctx, result.Error, "SubscribeWebPush")
	}

	var registered WebPushSubscription
	fetchResult := db.Table("web_push_subscriptions").Where("endpoint = ?", subscription.Endpoint).First(&registered)
	return ToWebPushSubscriptionDomain(registered), ToErrorCtx(ctx, fetchResult.Error, "SubscribeWebPush")
}

func (repo Repository) UnsubscribeWebPush(ctx context.Context, sessionId string, endpoint string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("web_push_subscriptions").
		Where("endpoint = ? AND session_id = ? AND deleted_at IS NULL", endpoint, sessionId).
		Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "UnsubscribeWebPush")
}

func (repo Repository) GetWebPushSubscriptionsBySessionId(ctx context.Context, sessionId string) ([]domain.WebPushSubscription, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var subscriptions []WebPushSubscription
	result := db.Table("web_push_subscriptions").Where("session_id = ? AND deleted_at IS NULL", sessionId).Find(&subscriptions)
	return ToWebPushSubscriptionsListDomain(subscriptions), ToErrorCtx(ctx, result.Error, "GetWebPushSubscriptionsBySessionId")
}
