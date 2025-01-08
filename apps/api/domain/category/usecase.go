package category

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetCategoryList(ctx context.Context) ([]Category, *base.Error) {
	return usecase.repository.GetCategoryList(ctx)
}

func (usecase Usecase) GetCategoryById(ctx context.Context, id int64) (Category, *base.Error) {
	return usecase.repository.GetCategoryById(ctx, id)
}

func (usecase Usecase) CreateCategory(ctx context.Context, categoryRequest CategoryRequest) *base.Error {
	return usecase.repository.CreateCategory(ctx, categoryRequest)
}

func (usecase Usecase) UpdateCategoryById(ctx context.Context, categoryRequest CategoryRequest, id int64) *base.Error {
	return usecase.repository.UpdateCategoryById(ctx, categoryRequest, id)
}

func (usecase Usecase) DeleteCategoryById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteCategoryById(ctx, id)
}
