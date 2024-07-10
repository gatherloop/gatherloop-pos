package products

import (
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetProductList() ([]apiContract.Product, error) {
	return usecase.repository.GetProductList()
}

func (usecase Usecase) GetProductById(id int64) (apiContract.Product, error) {
	return usecase.repository.GetProductById(id)
}

func (usecase Usecase) CreateProduct(productRequest apiContract.ProductRequest) error {
	return usecase.repository.CreateProduct(productRequest)
}

func (usecase Usecase) UpdateProductById(productRequest apiContract.ProductRequest, id int64) error {
	return usecase.repository.UpdateProductById(productRequest, id)
}

func (usecase Usecase) DeleteProductById(id int64) error {
	return usecase.repository.DeleteProductById(id)
}

func (usecase Usecase) GetProductMaterialList(productId int64) ([]apiContract.ProductMaterial, error) {
	return usecase.repository.GetProductMaterialList(productId)
}

func (usecase Usecase) GetProductMaterialById(productMaterialId int64) (apiContract.ProductMaterial, error) {
	return usecase.repository.GetProductMaterialById(productMaterialId)
}

func (usecase Usecase) CreateProductMaterial(productMaterialRequest apiContract.ProductMaterialRequest, productId int64) error {
	return usecase.repository.CreateProductMaterial(productMaterialRequest, productId)
}

func (usecase Usecase) UpdateProductMaterialById(productMaterialRequest apiContract.ProductMaterialRequest, id int64) error {
	return usecase.repository.UpdateProductMaterialById(productMaterialRequest, id)
}

func (usecase Usecase) DeleteProductMaterialById(productMaterialId int64) error {
	return usecase.repository.DeleteProductMaterialById(productMaterialId)
}
