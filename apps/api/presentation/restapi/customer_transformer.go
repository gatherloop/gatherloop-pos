package restapi

import apiContract "libs/api-contract"

// ToApiCustomer carries only the name (FR-4). The session ID is the request's
// own header and the row's id is an internal key — neither is anything the
// order app can do with, and the response exists solely to prefill the name
// prompt (D24).
func ToApiCustomer(name string) apiContract.Customer {
	return apiContract.Customer{Name: name}
}
