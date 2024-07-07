package categories

import (
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetCategoryList() ([]apiContract.Category, error) {
	return usecase.repository.GetCategoryList()
}

func (usecase Usecase) GetCategoryById(id int64) (apiContract.Category, error) {
	return usecase.repository.GetCategoryById(id)
}

func (usecase Usecase) CreateCategory(categoryRequest apiContract.CategoryRequest) error {
	return usecase.repository.CreateCategory(categoryRequest)
}

func (usecase Usecase) UpdateCategoryById(categoryRequest apiContract.CategoryRequest, id int64) error {
	return usecase.repository.UpdateCategoryById(categoryRequest, id)
}

func (usecase Usecase) DeleteCategoryById(id int64) error {
	return usecase.repository.DeleteCategoryById(id)
}
