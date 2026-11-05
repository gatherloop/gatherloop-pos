package domain

import (
	"context"
)

type CategoryUsecase struct {
	categoryRepoPort CategoryRepoPort
}

func NewCategoryUsecase(categoryRepoPort CategoryRepoPort) CategoryUsecase {
	return CategoryUsecase{categoryRepoPort: categoryRepoPort}
}

func (usecase CategoryUsecase) GetCategoryList(ctx context.Context) ([]Category, *Error) {
	return usecase.categoryRepoPort.GetCategoryList(ctx)
}

func (usecase CategoryUsecase) GetCategoryById(ctx context.Context, id int64) (Category, *Error) {
	return usecase.categoryRepoPort.GetCategoryById(ctx, id)
}

func (usecase CategoryUsecase) CreateCategory(ctx context.Context, category Category) (Category, *Error) {
	return usecase.categoryRepoPort.CreateCategory(ctx, category)
}

func (usecase CategoryUsecase) UpdateCategoryById(ctx context.Context, category Category, id int64) (Category, *Error) {
	return usecase.categoryRepoPort.UpdateCategoryById(ctx, category, id)
}

func (usecase CategoryUsecase) DeleteCategoryById(ctx context.Context, id int64) *Error {
	return usecase.categoryRepoPort.DeleteCategoryById(ctx, id)
}
