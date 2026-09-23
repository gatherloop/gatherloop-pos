package domain

import (
	"net/url"
	"strings"
)

// BuildOrderStatusUrl is FR-9: the link in the WhatsApp message that opens a payment's status
// page in any browser, carrying the payment's access key as ?k= (D4) so the guest's session need
// not match the one that paid.
func BuildOrderStatusUrl(baseUrl string, reference string, accessKey string) string {
	trimmedBaseUrl := strings.TrimRight(baseUrl, "/")

	return trimmedBaseUrl + "/orders/" + url.PathEscape(reference) + "?k=" + url.QueryEscape(accessKey)
}
