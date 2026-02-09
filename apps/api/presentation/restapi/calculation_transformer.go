package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetCalculationId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["calculationId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCalculationRequest(r *http.Request) (apiContract.CalculationRequest, error) {
	var calculationRequest apiContract.CalculationRequest
	err := json.NewDecoder(r.Body).Decode(&calculationRequest)
	return calculationRequest, err
}

func ToCalculation(calculationRequest apiContract.CalculationRequest) domain.Calculation {
	calculationItems := []domain.CalculationItem{}
	for _, item := range calculationRequest.CalculationItems {
		var id int64
		if item.Id != nil {
			id = *item.Id
		}

		calculationItems = append(calculationItems, domain.CalculationItem{
			Id:     id,
			Price:  item.Price,
			Amount: item.Amount,
		})
	}

	return domain.Calculation{
		WalletId:         calculationRequest.WalletId,
		CalculationItems: calculationItems,
	}
}

func ToApiCalculation(calculation domain.Calculation) apiContract.Calculation {
	calculationItems := []apiContract.CalculationItem{}
	for _, item := range calculation.CalculationItems {
		calculationItems = append(calculationItems, apiContract.CalculationItem{
			Id:            item.Id,
			CalculationId: item.CalculationId,
			Price:         item.Price,
			Amount:        item.Amount,
			Subtotal:      item.Subtotal,
		})
	}

	return apiContract.Calculation{
		Id:               calculation.Id,
		CreatedAt:        calculation.CreatedAt,
		UpdatedAt:        calculation.UpdatedAt,
		DeletedAt:        calculation.DeletedAt,
		CompletedAt:      calculation.CompletedAt,
		WalletId:         calculation.WalletId,
		Wallet:           ToApiWallet(calculation.Wallet),
		TotalWallet:      calculation.TotalWallet,
		TotalCalculation: calculation.TotalCalculation,
		CalculationItems: calculationItems,
	}
}
