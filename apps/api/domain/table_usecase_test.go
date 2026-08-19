package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func withTableTransaction(r *mock.MockTableRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func TestTableUsecase_GetTableList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockTableRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableList(gomock.Any()).Return([]domain.Table{
					{Id: 1, Code: "0123456789", Label: "Meja 1"},
					{Id: 2, Code: "ABCDEFGHJK", Label: "Meja 2"},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			tables, err := usecase.GetTableList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, tables, tt.expectedLen)
			}
		})
	}
}

func TestTableUsecase_GetTableById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockTableRepository)
		expectedLabel string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
			},
			expectedLabel: "Meja 1",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			table, err := usecase.GetTableById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedLabel, table.Label)
			}
		})
	}
}

func TestTableUsecase_GetTableByCode(t *testing.T) {
	tests := []struct {
		name          string
		code          string
		setupMock     func(r *mock.MockTableRepository)
		expectedLabel string
		expectedError *domain.Error
	}{
		{
			name: "success",
			code: "0123456789",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
			},
			expectedLabel: "Meja 1",
		},
		{
			name: "unknown code",
			code: "ZZZZZZZZZZ",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableByCode(gomock.Any(), "ZZZZZZZZZZ").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			table, err := usecase.GetTableByCode(context.Background(), tt.code)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedLabel, table.Label)
			}
		})
	}
}

func TestTableUsecase_CreateTable(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Table
		setupMock     func(r *mock.MockTableRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Table{Label: "Meja 1", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTable(gomock.Any(), gomock.Any()).Return(domain.Table{Id: 1, Label: "Meja 1"}, nil)
			},
			expectedId: 1,
		},
		{
			name:          "empty label",
			input:         domain.Table{Label: ""},
			setupMock:     func(r *mock.MockTableRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "floor number less than 1",
			input:         domain.Table{Label: "Meja 1", FloorNumber: 0},
			setupMock:     func(r *mock.MockTableRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate label",
			input: domain.Table{Label: "Meja 1", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1").Return(domain.Table{Id: 1, Label: "Meja 1"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "retries on code collision",
			input: domain.Table{Label: "Meja 2", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 2").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				gomock.InOrder(
					r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{Id: 9, Label: "Meja 9"}, nil),
					r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound}),
				)
				r.EXPECT().CreateTable(gomock.Any(), gomock.Any()).Return(domain.Table{Id: 2, Label: "Meja 2"}, nil)
			},
			expectedId: 2,
		},
		{
			name:  "exhausts attempts on repeated collision",
			input: domain.Table{Label: "Meja 3", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 3").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{Id: 9, Label: "Meja 9"}, nil).Times(5)
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name:  "repo error on create",
			input: domain.Table{Label: "Meja 4", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 4").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTable(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			table, err := usecase.CreateTable(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, table.Id)
			}
		})
	}
}

func TestTableUsecase_UpdateTableById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Table
		setupMock     func(r *mock.MockTableRepository)
		expectedLabel string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: domain.Table{Label: "Meja 1 Renamed", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1 Renamed").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
				r.EXPECT().UpdateTableById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1 Renamed"}, nil)
			},
			expectedLabel: "Meja 1 Renamed",
		},
		{
			name:          "empty label",
			id:            1,
			input:         domain.Table{Label: ""},
			setupMock:     func(r *mock.MockTableRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "floor number less than 1",
			id:            1,
			input:         domain.Table{Label: "Meja 1", FloorNumber: 0},
			setupMock:     func(r *mock.MockTableRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate label belongs to another table",
			id:    1,
			input: domain.Table{Label: "Meja 2", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 2").Return(domain.Table{Id: 2, Label: "Meja 2"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Table{Label: "Meja 99", FloorNumber: 1},
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 99").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			table, err := usecase.UpdateTableById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedLabel, table.Label)
			}
		})
	}
}

func TestTableUsecase_DeleteTableById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockTableRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().DeleteTableById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "repository error",
			id:   99,
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().DeleteTableById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			err := usecase.DeleteTableById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTableUsecase_RegenerateTableCode(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockTableRepository)
		expectedCode  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTableById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "ABCDEFGHJK", Label: "Meja 1"}, nil)
			},
			expectedCode: "ABCDEFGHJK",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransaction(r)
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTableUsecase(mockRepo)
			table, err := usecase.RegenerateTableCode(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedCode, table.Code)
			}
		})
	}
}
