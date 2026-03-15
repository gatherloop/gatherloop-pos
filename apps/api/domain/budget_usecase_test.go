package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestBudgetUsecase_GetBudgetList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockBudgetRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetList(gomock.Any()).Return([]domain.Budget{
					{Id: 1, Name: "Operations", Balance: 500},
					{Id: 2, Name: "Marketing", Balance: 300},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewBudgetUsecase(mockRepo)
			budgets, err := usecase.GetBudgetList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, budgets, tt.expectedLen)
			}
		})
	}
}

func TestBudgetUsecase_GetBudgetById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockBudgetRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Name: "Operations", Balance: 500}, nil)
			},
			expectedName: "Operations",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetById(gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound, Message: "budget not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewBudgetUsecase(mockRepo)
			budget, err := usecase.GetBudgetById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, budget.Name)
			}
		})
	}
}

func TestBudgetUsecase_CreateBudget(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Budget
		setupMock     func(r *mock.MockBudgetRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Budget{Name: "Savings", Percentage: 10},
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().CreateBudget(gomock.Any(), gomock.Any()).Return(domain.Budget{Id: 3, Name: "Savings"}, nil)
			},
			expectedId: 3,
		},
		{
			name:  "repository error",
			input: domain.Budget{Name: "Savings"},
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().CreateBudget(gomock.Any(), gomock.Any()).Return(domain.Budget{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewBudgetUsecase(mockRepo)
			budget, err := usecase.CreateBudget(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, budget.Id)
			}
		})
	}
}

func TestBudgetUsecase_UpdateBudgetById(t *testing.T) {
	tests := []struct {
		name            string
		id              int64
		input           domain.Budget
		setupMock       func(r *mock.MockBudgetRepository)
		expectedBalance float32
		expectedError   *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: domain.Budget{Balance: 1000},
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().UpdateBudgetById(gomock.Any(), domain.Budget{Balance: 1000}, int64(1)).Return(domain.Budget{Id: 1, Balance: 1000}, nil)
			},
			expectedBalance: 1000,
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Budget{Balance: 1000},
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewBudgetUsecase(mockRepo)
			budget, err := usecase.UpdateBudgetById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedBalance, budget.Balance)
			}
		})
	}
}

func TestBudgetUsecase_DeleteBudgetById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockBudgetRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().DeleteBudgetById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().DeleteBudgetById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewBudgetUsecase(mockRepo)
			err := usecase.DeleteBudgetById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
