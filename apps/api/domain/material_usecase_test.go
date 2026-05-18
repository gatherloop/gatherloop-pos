package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newMaterialUsecase(ctrl *gomock.Controller, matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) domain.MaterialUsecase {
	return domain.NewMaterialUsecase(matRepo, suppRepo)
}

func TestMaterialUsecase_GetMaterialList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockMaterialRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success — enriches with weekly usage",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10).Return([]domain.Material{
					{Id: 1, Name: "Sugar"},
					{Id: 2, Name: "Flour"},
				}, nil)
				r.EXPECT().GetMaterialListTotal(gomock.Any(), "").Return(int64(2), nil)
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1, 2}).Return(map[int64]float32{1: 5.0, 2: 3.0}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "error on GetMaterialList",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "error on GetMaterialListTotal",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.Material{{Id: 1, Name: "Sugar"}}, nil)
				r.EXPECT().GetMaterialListTotal(gomock.Any(), gomock.Any()).
					Return(int64(0), &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "error on GetMaterialsWeeklyUsage",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.Material{{Id: 1, Name: "Sugar"}}, nil)
				r.EXPECT().GetMaterialListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockMaterialRepository(ctrl)
			mockSupplierRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := newMaterialUsecase(ctrl, mockRepo, mockSupplierRepo)
			materials, _, err := usecase.GetMaterialList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, materials, tt.expectedLen)
			}
		})
	}
}

func TestMaterialUsecase_GetMaterialById(t *testing.T) {
	tests := []struct {
		name                string
		id                  int64
		setupMock           func(r *mock.MockMaterialRepository)
		expectedName        string
		expectedWeeklyUsage float32
		expectedError       *domain.Error
	}{
		{
			name: "success — enriched with weekly usage",
			id:   1,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(map[int64]float32{1: 7.5}, nil)
				r.EXPECT().GetMaterialById(gomock.Any(), int64(1)).Return(domain.Material{Id: 1, Name: "Sugar"}, nil)
			},
			expectedName:        "Sugar",
			expectedWeeklyUsage: 7.5,
		},
		{
			name: "error fetching weekly usage",
			id:   1,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{99}).Return(map[int64]float32{}, nil)
				r.EXPECT().GetMaterialById(gomock.Any(), int64(99)).Return(domain.Material{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockMaterialRepository(ctrl)
			mockSupplierRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := newMaterialUsecase(ctrl, mockRepo, mockSupplierRepo)
			material, err := usecase.GetMaterialById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, material.Name)
				assert.Equal(t, tt.expectedWeeklyUsage, material.WeeklyUsage)
			}
		})
	}
}

func TestMaterialUsecase_CreateMaterial(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Material
		setupMock     func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success — no suppliers",
			input: domain.Material{Name: "Salt", Price: 5000},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				matRepo.EXPECT().CreateMaterial(gomock.Any(), gomock.Any()).Return(domain.Material{Id: 3, Name: "Salt"}, nil)
				matRepo.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{3}).Return(map[int64]float32{3: 0}, nil)
			},
			expectedId: 3,
		},
		{
			name: "success — with valid online supplier",
			input: domain.Material{
				Name:  "Coffee",
				Price: 80000,
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 10, PurchaseType: domain.PurchaseTypeOnline, PurchaseUrl: "https://shop.example.com/coffee"},
				},
			},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				suppRepo.EXPECT().GetSupplierById(gomock.Any(), int64(10)).Return(domain.Supplier{Id: 10, Name: "Acme"}, nil)
				matRepo.EXPECT().CreateMaterial(gomock.Any(), gomock.Any()).Return(domain.Material{Id: 4, Name: "Coffee"}, nil)
				matRepo.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{4}).Return(map[int64]float32{4: 0}, nil)
			},
			expectedId: 4,
		},
		{
			name: "reject — online supplier with empty purchase_url",
			input: domain.Material{
				Name: "Coffee",
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 10, PurchaseType: domain.PurchaseTypeOnline, PurchaseUrl: ""},
				},
			},
			setupMock:     func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "reject — offline supplier with non-empty purchase_url",
			input: domain.Material{
				Name: "Sugar",
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 10, PurchaseType: domain.PurchaseTypeOffline, PurchaseUrl: "https://shop.example.com"},
				},
			},
			setupMock:     func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "reject — supplier not found",
			input: domain.Material{
				Name: "Sugar",
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 99, PurchaseType: domain.PurchaseTypeOffline, PurchaseUrl: ""},
				},
			},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				suppRepo.EXPECT().GetSupplierById(gomock.Any(), int64(99)).Return(domain.Supplier{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "repository error on create",
			input: domain.Material{Name: "Salt"},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				matRepo.EXPECT().CreateMaterial(gomock.Any(), gomock.Any()).Return(domain.Material{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockMaterialRepository(ctrl)
			mockSupplierRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo, mockSupplierRepo)

			usecase := newMaterialUsecase(ctrl, mockRepo, mockSupplierRepo)
			material, err := usecase.CreateMaterial(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, material.Id)
			}
		})
	}
}

func TestMaterialUsecase_UpdateMaterialById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Material
		setupMock     func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success — no suppliers",
			id:    1,
			input: domain.Material{Name: "Salt", Price: 5000},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				matRepo.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Material{Id: 1, Name: "Salt"}, nil)
				matRepo.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(map[int64]float32{1: 0}, nil)
			},
			expectedName: "Salt",
		},
		{
			name: "success — with offline supplier",
			id:   2,
			input: domain.Material{
				Name:  "Flour",
				Price: 12000,
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 10, PurchaseType: domain.PurchaseTypeOffline, PurchaseUrl: ""},
				},
			},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				suppRepo.EXPECT().GetSupplierById(gomock.Any(), int64(10)).Return(domain.Supplier{Id: 10, Name: "Market"}, nil)
				matRepo.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Material{Id: 2, Name: "Flour"}, nil)
				matRepo.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{2}).Return(map[int64]float32{2: 0}, nil)
			},
			expectedName: "Flour",
		},
		{
			name: "reject — invalid supplier in payload",
			id:   1,
			input: domain.Material{
				Name: "Salt",
				Suppliers: []domain.MaterialSupplier{
					{SupplierId: 10, PurchaseType: domain.PurchaseTypeOnline, PurchaseUrl: "not-a-url"},
				},
			},
			setupMock:     func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Material{Name: "Salt", Price: 5000},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				matRepo.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Material{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:  "repository error on UpdateMaterialById",
			id:    1,
			input: domain.Material{Name: "Salt"},
			setupMock: func(matRepo *mock.MockMaterialRepository, suppRepo *mock.MockSupplierRepository) {
				matRepo.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Material{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockMaterialRepository(ctrl)
			mockSupplierRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo, mockSupplierRepo)

			usecase := newMaterialUsecase(ctrl, mockRepo, mockSupplierRepo)
			material, err := usecase.UpdateMaterialById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, material.Name)
			}
		})
	}
}

func TestMaterialUsecase_DeleteMaterialById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockMaterialRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().DeleteMaterialById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().DeleteMaterialById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockMaterialRepository(ctrl)
			mockSupplierRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := newMaterialUsecase(ctrl, mockRepo, mockSupplierRepo)
			err := usecase.DeleteMaterialById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
