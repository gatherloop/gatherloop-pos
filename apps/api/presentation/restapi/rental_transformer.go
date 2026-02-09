package restapi

import (
	"apps/api/domain/rental"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetRentalId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["rentalId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCheckoutStatus(r *http.Request) rental.CheckoutStatus {
	checkoutStatusQuery := r.URL.Query().Get("checkoutStatus")
	switch checkoutStatusQuery {
	case "completed":
		return rental.Completed
	case "ongoing":
		return rental.Ongoing
	case "all":
		return rental.All
	default:
		return rental.All
	}
}

func GetRentalRequests(r *http.Request) ([]apiContract.RentalRequest, error) {
	var rentalRequests []apiContract.RentalRequest
	err := json.NewDecoder(r.Body).Decode(&rentalRequests)
	return rentalRequests, err
}

func GetRentalIds(r *http.Request) ([]int64, error) {
	var rentalRequests []int64
	err := json.NewDecoder(r.Body).Decode(&rentalRequests)
	return rentalRequests, err
}

func ToApiRental(rental rental.Rental) apiContract.Rental {
	return apiContract.Rental{
		Id:         rental.Id,
		Code:       rental.Code,
		Name:       rental.Name,
		VariantId:  rental.VariantId,
		Variant:    ToApiVariant(rental.Variant),
		CheckinAt:  rental.CheckinAt,
		CheckoutAt: rental.CheckoutAt,
		CreatedAt:  rental.CreatedAt,
	}
}

func ToRental(rentalRequest apiContract.RentalRequest) rental.Rental {
	return rental.Rental{
		Code:      rentalRequest.Code,
		Name:      rentalRequest.Name,
		VariantId: rentalRequest.VariantId,
		CheckinAt: rentalRequest.CheckinAt,
	}
}
