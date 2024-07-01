package categories

import (
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewCategoryUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetCategoryList() ([]apiContract.Category, error) {
	return usecase.repository.GetCategoryList()
}

func (usecase Usecase) CreateCategory(categoryRequest apiContract.CategoryRequest) error {
	return usecase.repository.CreateCategory(categoryRequest)
}
