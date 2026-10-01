package domain

import "time"

type TagColor string

const (
	TagColorRed    TagColor = "red"
	TagColorOrange TagColor = "orange"
	TagColorYellow TagColor = "yellow"
	TagColorGreen  TagColor = "green"
	TagColorBlue   TagColor = "blue"
	TagColorPurple TagColor = "purple"
	TagColorPink   TagColor = "pink"
	TagColorGray   TagColor = "gray"
)

func (color TagColor) IsValid() bool {
	switch color {
	case TagColorRed, TagColorOrange, TagColorYellow, TagColorGreen,
		TagColorBlue, TagColorPurple, TagColorPink, TagColorGray:
		return true
	}
	return false
}

type Tag struct {
	Id            int64
	Name          string
	Color         TagColor
	IsHighlighted bool
	SortOrder     int
	VariantCount  int64
	CreatedAt     time.Time
}

type VariantTag struct {
	Tag      Tag
	TaggedAt time.Time
}

type VariantTagPair struct {
	VariantId int64
	TagId     int64
}
