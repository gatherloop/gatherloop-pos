package restapi

import (
	"apps/api/domain"
	"encoding/json"
	"fmt"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetAvailabilityUpdateRequest(r *http.Request) (apiContract.AvailabilityUpdateRequest, error) {
	var availabilityUpdateRequest apiContract.AvailabilityUpdateRequest
	err := json.NewDecoder(r.Body).Decode(&availabilityUpdateRequest)
	return availabilityUpdateRequest, err
}

func GetAvailabilityMovementLevel(r *http.Request) (domain.AvailabilityMovementLevel, error) {
	vars := mux.Vars(r)
	level := domain.AvailabilityMovementLevel(vars["level"])
	if level != domain.AvailabilityMovementLevelProduct && level != domain.AvailabilityMovementLevelVariant {
		return "", fmt.Errorf("level must be product or variant")
	}
	return level, nil
}

func GetAvailabilityMovementId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	return strconv.ParseInt(vars["id"], 10, 64)
}

func ToApiAvailabilityVariant(variant domain.AvailabilityVariant) apiContract.AvailabilityVariant {
	return apiContract.AvailabilityVariant{
		VariantId:         variant.VariantId,
		VariantName:       variant.VariantName,
		IsAvailable:       variant.IsAvailable,
		AvailableQuantity: ToApiQuantity(variant.AvailableQuantity),
		IsSellable:        variant.IsSellable,
		SellableQuantity:  ToApiQuantity(variant.SellableQuantity),
	}
}

func ToApiAvailabilityProduct(product domain.AvailabilityProduct) apiContract.AvailabilityProduct {
	apiVariants := []apiContract.AvailabilityVariant{}
	for _, variant := range product.Variants {
		apiVariants = append(apiVariants, ToApiAvailabilityVariant(variant))
	}

	return apiContract.AvailabilityProduct{
		ProductId:            product.ProductId,
		ProductName:          product.ProductName,
		CategoryId:           product.CategoryId,
		CategoryName:         product.CategoryName,
		AvailabilityTracking: string(product.AvailabilityTracking),
		IsAvailable:          product.IsAvailable,
		AvailableQuantity:    ToApiQuantity(product.AvailableQuantity),
		IsSellable:           product.IsSellable,
		SellableQuantity:     ToApiQuantity(product.SellableQuantity),
		Variants:             apiVariants,
	}
}

func ToApiAvailabilityMovement(movement domain.AvailabilityMovement) apiContract.AvailabilityMovement {
	apiMovement := apiContract.AvailabilityMovement{
		Id:                movement.Id,
		Reason:            string(movement.Reason),
		CreatedAt:         movement.CreatedAt,
		ProductId:         movement.ProductId,
		VariantId:         movement.VariantId,
		TransactionId:     movement.TransactionId,
		Delta:             ToApiQuantity(movement.Delta),
		ResultingQuantity: ToApiQuantity(movement.ResultingQuantity),
	}
	if movement.Note != "" {
		apiMovement.Note = &movement.Note
	}
	return apiMovement
}

func ToDomainQuantity(quantity *int64) *int {
	if quantity == nil {
		return nil
	}
	value := int(*quantity)
	return &value
}

func ToAvailabilityProductUpdates(requests []apiContract.AvailabilityProductUpdateRequest) []domain.AvailabilityProductUpdate {
	updates := make([]domain.AvailabilityProductUpdate, 0, len(requests))
	for _, request := range requests {
		updates = append(updates, domain.AvailabilityProductUpdate{
			ProductId:         request.ProductId,
			IsAvailable:       request.IsAvailable,
			AvailableQuantity: ToDomainQuantity(request.AvailableQuantity),
		})
	}
	return updates
}

func ToAvailabilityVariantUpdates(requests []apiContract.AvailabilityVariantUpdateRequest) []domain.AvailabilityVariantUpdate {
	updates := make([]domain.AvailabilityVariantUpdate, 0, len(requests))
	for _, request := range requests {
		updates = append(updates, domain.AvailabilityVariantUpdate{
			VariantId:         request.VariantId,
			IsAvailable:       request.IsAvailable,
			AvailableQuantity: ToDomainQuantity(request.AvailableQuantity),
		})
	}
	return updates
}
