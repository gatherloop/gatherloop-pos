package restapi

import (
	"apps/api/domain/product"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetProductId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductIdQuery(r *http.Request) (*int, error) {
	productIdQuery := r.URL.Query().Get("productId")
	if productIdQuery == "" {
		return nil, nil
	} else {
		id, err := strconv.Atoi(productIdQuery)
		return &id, err
	}
}

func GetOptionValueIds(r *http.Request) ([]int, error) {
	query := r.URL.Query()
	values := query["optionValueIds[]"]

	ids := []int{}
	for _, v := range values {
		if id, err := strconv.Atoi(v); err == nil {
			ids = append(ids, id)
		} else {
			return []int{}, err
		}
	}

	return ids, nil
}

func GetProductRequest(r *http.Request) (apiContract.ProductRequest, error) {
	var productRequest apiContract.ProductRequest
	err := json.NewDecoder(r.Body).Decode(&productRequest)
	return productRequest, err
}

func ToApiProduct(product product.Product) apiContract.Product {
	apiOptions := []apiContract.Option{}
	for _, option := range product.Options {
		apiValues := []apiContract.OptionValue{}

		for _, value := range option.Values {
			apiValues = append(apiValues, apiContract.OptionValue{
				Id:   value.Id,
				Name: value.Name,
			})
		}

		apiOptions = append(apiOptions, apiContract.Option{
			Id:     option.Id,
			Name:   option.Name,
			Values: apiValues,
		})
	}

	return apiContract.Product{
		Id:          product.Id,
		Name:        product.Name,
		CategoryId:  product.CategoryId,
		Category:    apiContract.Category(product.Category),
		DeletedAt:   product.DeletedAt,
		CreatedAt:   product.CreatedAt,
		Description: product.Description,
		ImageUrl:    product.ImageUrl,
		Options:     apiOptions,
		SaleType:    string(product.SaleType),
	}
}

func ToProduct(productRequest apiContract.ProductRequest) product.Product {
	options := []product.Option{}

	for _, apiOption := range productRequest.Options {
		var id int64
		if apiOption.Id != nil {
			id = *apiOption.Id
		}

		values := []product.OptionValue{}

		for _, apiOptionValue := range apiOption.Values {
			var id int64
			if apiOptionValue.Id != nil {
				id = *apiOptionValue.Id
			}

			values = append(values, product.OptionValue{
				Id:   id,
				Name: apiOptionValue.Name,
			})
		}

		options = append(options, product.Option{
			Id:     id,
			Name:   apiOption.Name,
			Values: values,
		})
	}

	return product.Product{
		Name:        productRequest.Name,
		CategoryId:  productRequest.CategoryId,
		ImageUrl:    productRequest.ImageUrl,
		Description: productRequest.Description,
		Options:     options,
		SaleType:    product.SaleType(productRequest.SaleType),
	}
}

func GetSaleType(r *http.Request) product.SaleTypeQuery {
	saleTypeQuery := r.URL.Query().Get("saleType")
	switch saleTypeQuery {
	case "rental":
		return product.Rental
	case "purchase":
		return product.Purchase
	case "all":
		return product.All
	default:
		return product.All
	}
}
