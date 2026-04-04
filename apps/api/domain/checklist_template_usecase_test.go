package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newChecklistTemplateUsecase(ctrl *gomock.Controller) (domain.ChecklistTemplateUsecase, *mock.MockChecklistTemplateRepository) {
	repo := mock.NewMockChecklistTemplateRepository(ctrl)
	return domain.NewChecklistTemplateUsecase(repo), repo
}

func TestChecklistTemplateUsecase_GetChecklistTemplateList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(repo *mock.MockChecklistTemplateRepository)
		expectedLen   int
		expectedTotal int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateList(gomock.Any(), "", 0, 10).
					Return([]domain.ChecklistTemplate{{Id: 1, Name: "Opening"}, {Id: 2, Name: "Closing"}}, nil)
				repo.EXPECT().GetChecklistTemplateListTotal(gomock.Any(), "").Return(int64(2), nil)
			},
			expectedLen:   2,
			expectedTotal: 2,
		},
		{
			name: "error on list",
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "error on total",
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateList(gomock.Any(), "", 0, 10).
					Return([]domain.ChecklistTemplate{{Id: 1}}, nil)
				repo.EXPECT().GetChecklistTemplateListTotal(gomock.Any(), "").
					Return(int64(0), &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, repo := newChecklistTemplateUsecase(ctrl)
			tt.setupMock(repo)

			templates, total, err := usecase.GetChecklistTemplateList(context.Background(), "", 0, 10)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, templates, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, total)
			}
		})
	}
}

func TestChecklistTemplateUsecase_GetChecklistTemplateById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(repo *mock.MockChecklistTemplateRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening"}, nil)
			},
			expectedId: 1,
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(99)).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, repo := newChecklistTemplateUsecase(ctrl)
			tt.setupMock(repo)

			template, err := usecase.GetChecklistTemplateById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, template.Id)
			}
		})
	}
}

func TestChecklistTemplateUsecase_CreateChecklistTemplate(t *testing.T) {
	validItem := domain.ChecklistTemplateItem{Name: "Turn on lights", DisplayOrder: 1}
	validTemplate := domain.ChecklistTemplate{
		Name:  "Opening Checklist",
		Items: []domain.ChecklistTemplateItem{validItem},
	}

	tests := []struct {
		name          string
		input         domain.ChecklistTemplate
		setupMock     func(repo *mock.MockChecklistTemplateRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: validTemplate,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().CreateChecklistTemplate(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening Checklist"}, nil)
			},
			expectedId: 1,
		},
		{
			name: "success with sub-items",
			input: domain.ChecklistTemplate{
				Name: "Closing Checklist",
				Items: []domain.ChecklistTemplateItem{
					{
						Name:         "Turn off lights",
						DisplayOrder: 1,
						SubItems: []domain.ChecklistTemplateSubItem{
							{Name: "Bar lamp", DisplayOrder: 1},
							{Name: "Door lamp", DisplayOrder: 2},
						},
					},
				},
			},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Closing Checklist").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().CreateChecklistTemplate(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistTemplate{Id: 2, Name: "Closing Checklist"}, nil)
			},
			expectedId: 2,
		},
		{
			name:  "empty name",
			input: domain.ChecklistTemplate{Name: "", Items: []domain.ChecklistTemplateItem{validItem}},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "no items",
			input: domain.ChecklistTemplate{Name: "Opening", Items: []domain.ChecklistTemplateItem{}},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "item with empty name",
			input: domain.ChecklistTemplate{
				Name:  "Opening",
				Items: []domain.ChecklistTemplateItem{{Name: "", DisplayOrder: 1}},
			},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "sub-item with empty name",
			input: domain.ChecklistTemplate{
				Name: "Opening",
				Items: []domain.ChecklistTemplateItem{
					{
						Name:         "Lights",
						DisplayOrder: 1,
						SubItems:     []domain.ChecklistTemplateSubItem{{Name: "", DisplayOrder: 1}},
					},
				},
			},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate name",
			input: validTemplate,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{Id: 5, Name: "Opening Checklist"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "repo error on create",
			input: validTemplate,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().CreateChecklistTemplate(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, repo := newChecklistTemplateUsecase(ctrl)
			tt.setupMock(repo)

			template, err := usecase.CreateChecklistTemplate(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, template.Id)
			}
		})
	}
}

func TestChecklistTemplateUsecase_UpdateChecklistTemplateById(t *testing.T) {
	validItem := domain.ChecklistTemplateItem{Name: "Turn on lights", DisplayOrder: 1}
	validTemplate := domain.ChecklistTemplate{
		Name:  "Opening Checklist",
		Items: []domain.ChecklistTemplateItem{validItem},
	}

	tests := []struct {
		name          string
		id            int64
		input         domain.ChecklistTemplate
		setupMock     func(repo *mock.MockChecklistTemplateRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: validTemplate,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening Checklist"}, nil)
				repo.EXPECT().UpdateChecklistTemplateById(gomock.Any(), gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening Checklist"}, nil)
			},
			expectedId: 1,
		},
		{
			name:  "success — rename to unique name",
			id:    1,
			input: domain.ChecklistTemplate{Name: "New Name", Items: []domain.ChecklistTemplateItem{validItem}},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "New Name").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().UpdateChecklistTemplateById(gomock.Any(), gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1, Name: "New Name"}, nil)
			},
			expectedId: 1,
		},
		{
			name:  "duplicate name — name belongs to another template",
			id:    1,
			input: validTemplate,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{Id: 99, Name: "Opening Checklist"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "empty name",
			id:    1,
			input: domain.ChecklistTemplate{Name: "", Items: []domain.ChecklistTemplateItem{validItem}},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "no items",
			id:    1,
			input: domain.ChecklistTemplate{Name: "Opening", Items: []domain.ChecklistTemplateItem{}},
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, repo := newChecklistTemplateUsecase(ctrl)
			tt.setupMock(repo)

			template, err := usecase.UpdateChecklistTemplateById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, template.Id)
			}
		})
	}
}

func TestChecklistTemplateUsecase_DeleteChecklistTemplateById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(repo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1}, nil)
				repo.EXPECT().DeleteChecklistTemplateById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(99)).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "repo error on delete",
			id:   1,
			setupMock: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1}, nil)
				repo.EXPECT().DeleteChecklistTemplateById(gomock.Any(), int64(1)).
					Return(&domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, repo := newChecklistTemplateUsecase(ctrl)
			tt.setupMock(repo)

			err := usecase.DeleteChecklistTemplateById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
