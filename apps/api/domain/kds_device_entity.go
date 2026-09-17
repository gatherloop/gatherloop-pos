package domain

import "time"

type KdsPlatform string

const (
	KdsPlatformIos     KdsPlatform = "ios"
	KdsPlatformAndroid KdsPlatform = "android"
)

type KdsDevice struct {
	Id         int64
	Name       string
	PushToken  string
	Platform   KdsPlatform
	CreatedAt  time.Time
	LastSeenAt *time.Time
	DeletedAt  *time.Time
}
