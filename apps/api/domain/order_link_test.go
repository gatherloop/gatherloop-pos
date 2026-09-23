package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildOrderStatusUrl(t *testing.T) {
	testCases := []struct {
		name      string
		baseUrl   string
		reference string
		accessKey string
		expected  string
	}{
		{
			name:      "plain base url",
			baseUrl:   "https://order.gatherloop.id",
			reference: "ORD7K2M9QX4B1HZT",
			accessKey: "q3Vd0bX9pL2sR8tY1wZa7c",
			expected:  "https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=q3Vd0bX9pL2sR8tY1wZa7c",
		},
		{
			name:      "trailing slash on the base url is dropped",
			baseUrl:   "https://order.gatherloop.id/",
			reference: "ORD7K2M9QX4B1HZT",
			accessKey: "q3Vd0bX9pL2sR8tY1wZa7c",
			expected:  "https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=q3Vd0bX9pL2sR8tY1wZa7c",
		},
		{
			name:      "multiple trailing slashes on the base url are dropped",
			baseUrl:   "https://order.gatherloop.id///",
			reference: "ORD7K2M9QX4B1HZT",
			accessKey: "q3Vd0bX9pL2sR8tY1wZa7c",
			expected:  "https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=q3Vd0bX9pL2sR8tY1wZa7c",
		},
		{
			name:      "an access key with url-unsafe characters is query-escaped",
			baseUrl:   "https://order.gatherloop.id",
			reference: "ORD7K2M9QX4B1HZT",
			accessKey: "a+b/c=d",
			expected:  "https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=a%2Bb%2Fc%3Dd",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, domain.BuildOrderStatusUrl(tc.baseUrl, tc.reference, tc.accessKey))
		})
	}
}
