package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
)

func ToApiCustomer(customer domain.Customer) apiContract.Customer {
	whatsappNumber := ""
	if customer.WhatsappNumber != nil {
		whatsappNumber = *customer.WhatsappNumber
	}
	return apiContract.Customer{Name: customer.Name, WhatsappNumber: whatsappNumber}
}
