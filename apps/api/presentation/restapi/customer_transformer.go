package restapi

import apiContract "libs/api-contract"

func ToApiCustomer(name string) apiContract.Customer {
	return apiContract.Customer{Name: name}
}
