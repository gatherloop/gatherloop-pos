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
	product := apiContract.Product{
		Name:       productRequest.Name,
		CategoryId: productRequest.CategoryId,
		Price:      productRequest.Price,
	}

	if err := usecase.repository.CreateProduct(&product); err != nil {
		return err
	}

	for _, productMaterialRequest := range productRequest.Materials {
		if err := usecase.repository.CreateProductMaterial(productMaterialRequest, product.Id); err != nil {
			return err
		}
	}

	return nil
}

func (usecase Usecase) UpdateProductById(productRequest apiContract.ProductRequest, id int64) error {
	product := apiContract.Product{
		Name:       productRequest.Name,
		CategoryId: productRequest.CategoryId,
		Price:      productRequest.Price,
	}

	if err := usecase.repository.UpdateProductById(&product, id); err != nil {
		return err
	}

	if err := usecase.repository.DeleteProductMaterials(id); err != nil {
		return err
	}

	for _, productMaterialRequest := range productRequest.Materials {
		if err := usecase.repository.CreateProductMaterial(productMaterialRequest, id); err != nil {
			return err
		}
	}

	return nil
}

func (usecase Usecase) DeleteProductById(id int64) error {
	return usecase.repository.DeleteProductById(id)
}
