package categories

import (
	"context"
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetCategoryList(ctx context.Context) ([]apiContract.Category, error) {
	return usecase.repository.GetCategoryList(ctx)
}

func (usecase Usecase) GetCategoryById(ctx context.Context, id int64) (apiContract.Category, error) {
	return usecase.repository.GetCategoryById(ctx, id)
}

func (usecase Usecase) CreateCategory(ctx context.Context, categoryRequest apiContract.CategoryRequest) error {
	return usecase.repository.CreateCategory(ctx, categoryRequest)
}

func (usecase Usecase) UpdateCategoryById(ctx context.Context, categoryRequest apiContract.CategoryRequest, id int64) error {
	return usecase.repository.UpdateCategoryById(ctx, categoryRequest, id)
}

func (usecase Usecase) DeleteCategoryById(ctx context.Context, id int64) error {
	return usecase.repository.DeleteCategoryById(ctx, id)
}
