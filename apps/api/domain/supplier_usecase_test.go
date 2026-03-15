package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestSupplierUsecase_GetSupplierList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockSupplierRepository)
		expectedLen   int
		expectedTotal int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10).
					Return([]domain.Supplier{{Id: 1, Name: "SupplierA"}, {Id: 2, Name: "SupplierB"}}, nil)
				r.EXPECT().GetSupplierListTotal(gomock.Any(), "").Return(int64(2), nil)
			},
			expectedLen:   2,
			expectedTotal: 2,
		},
		{
			name: "error on GetSupplierList",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "error on GetSupplierListTotal",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.Supplier{{Id: 1}}, nil)
				r.EXPECT().GetSupplierListTotal(gomock.Any(), gomock.Any()).Return(int64(0), &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewSupplierUsecase(mockRepo)
			suppliers, total, err := usecase.GetSupplierList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, suppliers, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, total)
			}
		})
	}
}

func TestSupplierUsecase_GetSupplierById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockSupplierRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierById(gomock.Any(), int64(1)).Return(domain.Supplier{Id: 1, Name: "SupplierA"}, nil)
			},
			expectedName: "SupplierA",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierById(gomock.Any(), int64(99)).Return(domain.Supplier{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewSupplierUsecase(mockRepo)
			supplier, err := usecase.GetSupplierById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, supplier.Name)
			}
		})
	}
}

func TestSupplierUsecase_CreateSupplier(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Supplier
		setupMock     func(r *mock.MockSupplierRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Supplier{Name: "NewSupplier"},
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().CreateSupplier(gomock.Any(), gomock.Any()).Return(domain.Supplier{Id: 3, Name: "NewSupplier"}, nil)
			},
			expectedId: 3,
		},
		{
			name:  "repository error",
			input: domain.Supplier{Name: "NewSupplier"},
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().CreateSupplier(gomock.Any(), gomock.Any()).Return(domain.Supplier{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewSupplierUsecase(mockRepo)
			supplier, err := usecase.CreateSupplier(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, supplier.Id)
			}
		})
	}
}

func TestSupplierUsecase_DeleteSupplierById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockSupplierRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().DeleteSupplierById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().DeleteSupplierById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewSupplierUsecase(mockRepo)
			err := usecase.DeleteSupplierById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
