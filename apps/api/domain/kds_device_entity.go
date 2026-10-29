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

func (device KdsDevice) Validate() *Error {
	if device.Name == "" {
		return &Error{Type: BadRequest, Message: "name must not be empty"}
	}
	if device.PushToken == "" {
		return &Error{Type: BadRequest, Message: "pushToken must not be empty"}
	}
	if device.Platform != KdsPlatformIos && device.Platform != KdsPlatformAndroid {
		return &Error{Type: BadRequest, Message: "platform must be ios or android"}
	}
	return nil
}
