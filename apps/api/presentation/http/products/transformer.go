package products_http

import (
	"apps/api/domain/products"
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

func GetProductRequest(r *http.Request) (apiContract.ProductRequest, error) {
	var productRequest apiContract.ProductRequest
	err := json.NewDecoder(r.Body).Decode(&productRequest)
	return productRequest, err
}

func GetProductMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productMaterialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductMaterialRequest(r *http.Request) (apiContract.ProductMaterialRequest, error) {
	var productMaterialRequest apiContract.ProductMaterialRequest
	err := json.NewDecoder(r.Body).Decode(&productMaterialRequest)
	return productMaterialRequest, err
}

func ToApiProductMaterial(productMaterial products.ProductMaterial) apiContract.ProductMaterial {
	return apiContract.ProductMaterial{
		Id:         productMaterial.Id,
		ProductId:  productMaterial.ProductId,
		MaterialId: productMaterial.MaterialId,
		Amount:     productMaterial.Amount,
		DeletedAt:  productMaterial.DeletedAt,
		CreatedAt:  productMaterial.CreatedAt,
		Material:   apiContract.Material(productMaterial.Material),
	}
}

func ToApiProduct(product products.Product) apiContract.Product {
	var apiMaterials []apiContract.ProductMaterial

	for _, productMaterial := range product.Materials {
		apiMaterials = append(apiMaterials, ToApiProductMaterial(productMaterial))
	}

	return apiContract.Product{
		Id:         product.Id,
		Name:       product.Name,
		Price:      product.Price,
		CategoryId: product.CategoryId,
		Category:   apiContract.Category(product.Category),
		Materials:  apiMaterials,
		DeletedAt:  product.DeletedAt,
		CreatedAt:  product.CreatedAt,
	}
}

func ToProductRequest(productRequest apiContract.ProductRequest) products.ProductRequest {
	var productMaterials []products.ProductMaterialRequest
	for _, productMaterial := range productRequest.Materials {
		productMaterials = append(productMaterials, products.ProductMaterialRequest{
			MaterialId: productMaterial.MaterialId,
			Amount:     productMaterial.Amount,
		})
	}

	return products.ProductRequest{
		Name:       productRequest.Name,
		Price:      productRequest.Price,
		CategoryId: productRequest.CategoryId,
		Materials:  productMaterials,
	}
}
