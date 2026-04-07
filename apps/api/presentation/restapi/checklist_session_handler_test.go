package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newChecklistSessionHandler(t *testing.T, setupMocks func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)) (restapi.ChecklistSessionHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	sessionRepo := mock.NewMockChecklistSessionRepository(ctrl)
	templateRepo := mock.NewMockChecklistTemplateRepository(ctrl)
	setupMocks(sessionRepo, templateRepo)
	usecase := domain.NewChecklistSessionUsecase(sessionRepo, templateRepo)
	return restapi.NewChecklistSessionHandler(usecase), ctrl
}

func TestChecklistSessionHandler_GetChecklistSessionList(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    string
		setupMocks     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus int
	}{
		{
			name:        "success - no filters",
			queryParams: "",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.ChecklistSession{
						{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"},
						{Id: 2, ChecklistTemplateId: 1, Date: "2026-04-06"},
					}, nil)
				sessionRepo.EXPECT().GetChecklistSessionListTotal(gomock.Any(), gomock.Any()).
					Return(int64(2), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:        "success - with templateId filter",
			queryParams: "?templateId=1&limit=5&skip=0",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.ChecklistSession{{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"}}, nil)
				sessionRepo.EXPECT().GetChecklistSessionListTotal(gomock.Any(), gomock.Any()).
					Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:        "success - with status completed filter",
			queryParams: "?status=completed",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.ChecklistSession{}, nil)
				sessionRepo.EXPECT().GetChecklistSessionListTotal(gomock.Any(), gomock.Any()).
					Return(int64(0), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:        "invalid skip param",
			queryParams: "?skip=abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/checklist-sessions"+tt.queryParams, nil)
			w := httptest.NewRecorder()
			handler.GetChecklistSessionList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_CreateChecklistSession(t *testing.T) {
	now := time.Now()
	_ = now

	tests := []struct {
		name           string
		body           string
		setupMocks     func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"checklistTemplateId": 1, "date": "2026-04-05"}`,
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{
						Id:   1,
						Name: "Opening Checklist",
						Items: []domain.ChecklistTemplateItem{
							{Id: 10, Name: "Turn on lights", DisplayOrder: 1, SubItems: []domain.ChecklistTemplateSubItem{}},
						},
					}, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(1), "2026-04-05").
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound})
				sessionRepo.EXPECT().CreateChecklistSession(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistSession{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing template id",
			body: `{"checklistTemplateId": 0, "date": "2026-04-05"}`,
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing date",
			body: `{"checklistTemplateId": 1, "date": ""}`,
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "duplicate session",
			body: `{"checklistTemplateId": 1, "date": "2026-04-05"}`,
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				templateRepo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{
						Id:    1,
						Name:  "Opening Checklist",
						Items: []domain.ChecklistTemplateItem{{Id: 10, Name: "Turn on lights", DisplayOrder: 1}},
					}, nil)
				sessionRepo.EXPECT().GetChecklistSessionByTemplateAndDate(gomock.Any(), int64(1), "2026-04-05").
					Return(domain.ChecklistSession{Id: 5}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/checklist-sessions", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateChecklistSession(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_GetChecklistSessionById(t *testing.T) {
	tests := []struct {
		name               string
		checklistSessionId string
		setupMocks         func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus     int
	}{
		{
			name:               "success",
			checklistSessionId: "1",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, ChecklistTemplateId: 1, Date: "2026-04-05"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:               "not found",
			checklistSessionId: "99",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:               "invalid id",
			checklistSessionId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/checklist-sessions/"+tt.checklistSessionId, nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionId": tt.checklistSessionId})
			w := httptest.NewRecorder()
			handler.GetChecklistSessionById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_DeleteChecklistSessionById(t *testing.T) {
	tests := []struct {
		name               string
		checklistSessionId string
		setupMocks         func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus     int
	}{
		{
			name:               "success",
			checklistSessionId: "1",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1}, nil)
				sessionRepo.EXPECT().DeleteChecklistSessionById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:               "invalid id",
			checklistSessionId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:               "not found",
			checklistSessionId: "99",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSession{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/checklist-sessions/"+tt.checklistSessionId, nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionId": tt.checklistSessionId})
			w := httptest.NewRecorder()
			handler.DeleteChecklistSessionById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_CheckSessionItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                   string
		checklistSessionItemId string
		setupMocks             func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus         int
	}{
		{
			name:                   "success",
			checklistSessionItemId: "10",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
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
			expectedStatus: http.StatusOK,
		},
		{
			name:                   "invalid id",
			checklistSessionItemId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:                   "item has sub-items",
			checklistSessionItemId: "20",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{
						Id:                 20,
						ChecklistSessionId: 1,
						SubItems:           []domain.ChecklistSessionSubItem{{Id: 100, Name: "Bar Lamp"}},
					}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:                   "not found",
			checklistSessionItemId: "99",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/checklist-session-items/"+tt.checklistSessionItemId+"/check", nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionItemId": tt.checklistSessionItemId})
			w := httptest.NewRecorder()
			handler.CheckSessionItem(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_UncheckSessionItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                   string
		checklistSessionItemId string
		setupMocks             func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus         int
	}{
		{
			name:                   "success",
			checklistSessionItemId: "10",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(10)).
					Return(domain.ChecklistSessionItem{Id: 10, ChecklistSessionId: 1, CompletedAt: &now, SubItems: []domain.ChecklistSessionSubItem{}}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionItemCompletedAt(gomock.Any(), int64(10), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionById(gomock.Any(), int64(1)).
					Return(domain.ChecklistSession{Id: 1, CompletedAt: nil}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:                   "invalid id",
			checklistSessionItemId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:                   "item has sub-items",
			checklistSessionItemId: "20",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{
						Id:                 20,
						ChecklistSessionId: 1,
						CompletedAt:        &now,
						SubItems:           []domain.ChecklistSessionSubItem{{Id: 100, Name: "Bar Lamp"}},
					}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/checklist-session-items/"+tt.checklistSessionItemId+"/uncheck", nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionItemId": tt.checklistSessionItemId})
			w := httptest.NewRecorder()
			handler.UncheckSessionItem(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_CheckSessionSubItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                      string
		checklistSessionSubItemId string
		setupMocks                func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus            int
	}{
		{
			name:                      "success",
			checklistSessionSubItemId: "100",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
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
			expectedStatus: http.StatusOK,
		},
		{
			name:                      "invalid id",
			checklistSessionSubItemId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:                      "not found",
			checklistSessionSubItemId: "99",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionSubItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/checklist-session-sub-items/"+tt.checklistSessionSubItemId+"/check", nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionSubItemId": tt.checklistSessionSubItemId})
			w := httptest.NewRecorder()
			handler.CheckSessionSubItem(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistSessionHandler_UncheckSessionSubItem(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                      string
		checklistSessionSubItemId string
		setupMocks                func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository)
		expectedStatus            int
	}{
		{
			name:                      "success",
			checklistSessionSubItemId: "100",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(100)).
					Return(domain.ChecklistSessionSubItem{Id: 100, ChecklistSessionItemId: 20, CompletedAt: &now}, nil)
				sessionRepo.EXPECT().UpdateChecklistSessionSubItemCompletedAt(gomock.Any(), int64(100), (*time.Time)(nil)).Return(nil)
				sessionRepo.EXPECT().GetChecklistSessionItemById(gomock.Any(), int64(20)).
					Return(domain.ChecklistSessionItem{Id: 20, ChecklistSessionId: 1, CompletedAt: nil}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:                      "invalid id",
			checklistSessionSubItemId: "abc",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:                      "not found",
			checklistSessionSubItemId: "99",
			setupMocks: func(sessionRepo *mock.MockChecklistSessionRepository, templateRepo *mock.MockChecklistTemplateRepository) {
				sessionRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				sessionRepo.EXPECT().GetChecklistSessionSubItemById(gomock.Any(), int64(99)).
					Return(domain.ChecklistSessionSubItem{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistSessionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/checklist-session-sub-items/"+tt.checklistSessionSubItemId+"/uncheck", nil)
			req = mux.SetURLVars(req, map[string]string{"checklistSessionSubItemId": tt.checklistSessionSubItemId})
			w := httptest.NewRecorder()
			handler.UncheckSessionSubItem(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
