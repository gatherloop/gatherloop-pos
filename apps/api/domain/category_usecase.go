package domain

import (
	"context"
)

type CategoryUsecase struct {
	repository CategoryRepository
}

func NewCategoryUsecase(repository CategoryRepository) CategoryUsecase {
	return CategoryUsecase{repository: repository}
}

func (usecase CategoryUsecase) GetCategoryList(ctx context.Context) ([]Category, *Error) {
	return usecase.repository.GetCategoryList(ctx)
}

func (usecase CategoryUsecase) GetCategoryById(ctx context.Context, id int64) (Category, *Error) {
	return usecase.repository.GetCategoryById(ctx, id)
}

func (usecase CategoryUsecase) CreateCategory(ctx context.Context, category Category) *Error {
	return usecase.repository.CreateCategory(ctx, &category)
}

func (usecase CategoryUsecase) UpdateCategoryById(ctx context.Context, category Category, id int64) *Error {
	return usecase.repository.UpdateCategoryById(ctx, &category, id)
}

func (usecase CategoryUsecase) DeleteCategoryById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteCategoryById(ctx, id)
}
