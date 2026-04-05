package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newChecklistSessionUsecase(ctrl *gomock.Controller) (domain.ChecklistSessionUsecase, *mock.MockChecklistSessionRepository, *mock.MockChecklistTemplateRepository) {
	sessionRepo := mock.NewMockChecklistSessionRepository(ctrl)
	templateRepo := mock.NewMockChecklistTemplateRepository(ctrl)
	return domain.NewChecklistSessionUsecase(sessionRepo, templateRepo), sessionRepo, templateRepo
}

func TestChecklistSessionUsecase_CreateChecklistSession(t *testing.T) {
	validTemplate := domain.ChecklistTemplate{
		Id:   1,
		Name: "Opening Checklist",
		Items: []domain.ChecklistTemplateItem{
			{
				Id:           10,
				Name:         "Turn on lights",
				DisplayOrder: 1,
				SubItems:     []domain.ChecklistTemplateSubItem{},
			},
		},
	}

	validTemplateWithSubItems := domain.ChecklistTemplate{
		Id:   2,
		Name: "Closing Checklist",
		Items: []domain.ChecklistTemplateItem{
			{
				Id:           20,
				Name:         "Turn off lights",
				DisplayOrder: 1,
				SubItems: []domain.ChecklistTemplateSubItem{
					{Id: 100, Name: "Bar Lamp", DisplayOrder: 1},
					{Id: 101, Name: "Door Lamp", DisplayOrder: 2},
				},
			},
		},
	}

	tests := []struct {
		name          string
		input         domain.ChecklistSession
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 1,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(validTemplate, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(1), "2026-04-05").
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound})
				sessionRepo.EXPECT().CreateChecklistSession(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistSession{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"}, nil)
			},
			expectedId: 1,
		},
		{
			name: "success with sub-items",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 2,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(2)).
					Return(validTemplateWithSubItems, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(2), "2026-04-05").
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound})
				sessionRepo.EXPECT().CreateChecklistSession(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistSession{Id: 2, ChecklistTemplateId: 2, Date: "2026-04-05"}, nil)
			},
			expectedId: 2,
		},
		{
			name: "missing template id",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 0,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "missing date",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 1,
				Date:                "",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "template not found",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 99,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(99)).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "duplicate session",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 1,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(validTemplate, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(1), "2026-04-05").
					Return(domain.ChecklistSession{Id: 5}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "repo error on create",
			input: domain.ChecklistSession{
				ChecklistTemplateId: 1,
				Date:                "2026-04-05",
			},
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(validTemplate, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(1), "2026-04-05").
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound})
				sessionRepo.EXPECT().CreateChecklistSession(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			session, err := usecase.CreateChecklistSession(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, session.Id)
			}
		})
	}
}

func TestChecklistSessionUsecase_GetChecklistSessionById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"}, nil)
			},
			expectedId: 1,
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			session, err := usecase.GetChecklistSessionById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, session.Id)
			}
		})
	}
}

func TestChecklistSessionUsecase_DeleteChecklistSessionById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1}, nil)
				sessionRepo.EXPECT().DeleteChecklistSessionById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "repo error on delete",
			id:   1,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1}, nil)
				sessionRepo.EXPECT().DeleteChecklistSessionById(gomock.Any(), int64(1)).
					Return(&domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			err := usecase.DeleteChecklistSessionById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestChecklistSessionUsecase_CheckSessionItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name          string
		itemId        int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name:   "success - item without sub-items, not last item",
			itemId: 10,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(10)).
					Return(domain.ChecklistSessionItem{Id: 10, ChecklistSessionId: 1, SubItems: []domain.ChecklistSessionSubItem{}}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(10), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemsBySessionId(gomock.Any(), int64(1)).
					Return([]domain.ChecklistSessionItem{
						{Id: 10, CompletedAt: &now},
						{Id: 11, CompletedAt: nil},
					}, nil)
			},
		},
		{
			name:   "success - item without sub-items, last item (auto-complete session)",
			itemId: 10,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(10)).
					Return(domain.ChecklistSessionItem{Id: 10, ChecklistSessionId: 1, SubItems: []domain.ChecklistSessionSubItem{}}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(10), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemsBySessionId(gomock.Any(), int64(1)).
					Return([]domain.ChecklistSessionItem{
						{Id: 10, CompletedAt: &now},
						{Id: 11, CompletedAt: &now},
					}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionCompletedAt(gomock.Any(), int64(1), gomock.Any()).Return(nil)
			},
		},
		{
			name:   "error - item has sub-items (cannot check directly)",
			itemId: 20,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{
						Id:               20,
						ChecklistSessionId: 1,
						SubItems: []domain.ChecklistSessionSubItem{
							{Id: 100, Name: "Bar Lamp"},
						},
					}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:   "item not found",
			itemId: 99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			err := usecase.CheckSessionItem(context.Background(), tt.itemId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestChecklistSessionUsecase_UncheckSessionItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name          string
		itemId        int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name:   "success - session was not completed",
			itemId: 10,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(10)).
					Return(domain.ChecklistSessionItem{Id: 10, ChecklistSessionId: 1, CompletedAt: &now, SubItems: []domain.ChecklistSessionSubItem{}}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(10), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, CompletedAt: nil}, nil)
			},
		},
		{
			name:   "success - session was completed (revert session completion)",
			itemId: 10,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(10)).
					Return(domain.ChecklistSessionItem{Id: 10, ChecklistSessionId: 1, CompletedAt: &now, SubItems: []domain.ChecklistSessionSubItem{}}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(10), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionCompletedAt(gomock.Any(), int64(1), (*time.Time)(nil)).Return(nil)
			},
		},
		{
			name:   "error - item has sub-items (cannot uncheck directly)",
			itemId: 20,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{
						Id:               20,
						ChecklistSessionId: 1,
						CompletedAt:      &now,
						SubItems: []domain.ChecklistSessionSubItem{
							{Id: 100, Name: "Bar Lamp"},
						},
					}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:   "item not found",
			itemId: 99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			err := usecase.UncheckSessionItem(context.Background(), tt.itemId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestChecklistSessionUsecase_CheckSessionSubItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name          string
		subItemId     int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name:      "success - not last sub-item",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionSubItemsByItemId(gomock.Any(), int64(20)).
					Return([]domain.ChecklistSessionSubItem{
						{Id: 100, CompletedAt: &now},
						{Id: 101, CompletedAt: nil},
					}, nil)
			},
		},
		{
			name:      "success - last sub-item (auto-complete item), not last item",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionSubItemsByItemId(gomock.Any(), int64(20)).
					Return([]domain.ChecklistSessionSubItem{
						{Id: 100, CompletedAt: &now},
						{Id: 101, CompletedAt: &now},
					}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(20), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().GetChecklistSessionItemsBySessionId(gomock.Any(), int64(1)).
					Return([]domain.ChecklistSessionItem{
						{Id: 20, CompletedAt: &now},
						{Id: 21, CompletedAt: nil},
					}, nil)
			},
		},
		{
			name:      "success - last sub-item (auto-complete item and session)",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionSubItemsByItemId(gomock.Any(), int64(20)).
					Return([]domain.ChecklistSessionSubItem{
						{Id: 100, CompletedAt: &now},
						{Id: 101, CompletedAt: &now},
					}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(20), gomock.Any()).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().GetChecklistSessionItemsBySessionId(gomock.Any(), int64(1)).
					Return([]domain.ChecklistSessionItem{
						{Id: 20, CompletedAt: &now},
						{Id: 21, CompletedAt: &now},
					}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionCompletedAt(gomock.Any(), int64(1), gomock.Any()).Return(nil)
			},
		},
		{
			name:      "sub-item not found",
			subItemId: 99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionSubItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			err := usecase.CheckSessionSubItem(context.Background(), tt.subItemId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestChecklistSessionUsecase_UncheckSessionSubItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name          string
		subItemId     int64
		setupMock     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedError *domain.Error
	}{
		{
			name:      "success - parent item was not completed",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: nil}, nil)
			},
		},
		{
			name:      "success - parent item was completed (revert item and session completion)",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(20), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, CompletedAt: nil}, nil)
			},
		},
		{
			name:      "success - parent item and session were completed (revert both)",
			subItemId: 100,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(20), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionCompletedAt(gomock.Any(), int64(1), (*time.Time)(nil)).Return(nil)
			},
		},
		{
			name:      "sub-item not found",
			subItemId: 99,
			setupMock: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionSubItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, sessionRepo, templateRepo := newChecklistSessionUsecase(ctrl)
			tt.setupMock(sessionRepo, templateRepo)

			err := usecase.UncheckSessionSubItem(context.Background(), tt.subItemId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
