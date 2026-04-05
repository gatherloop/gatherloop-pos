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

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newChecklistTemplateHandler(t *testing.T, setupMocks func(repo *mock.MockChecklistTemplateRepository)) (restapi.ChecklistTemplateHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockChecklistTemplateRepository(ctrl)
	setupMocks(repo)
	usecase := domain.NewChecklistTemplateUsecase(repo)
	return restapi.NewChecklistTemplateHandler(usecase), ctrl
}

func TestChecklistTemplateHandler_GetChecklistTemplateList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(repo *mock.MockChecklistTemplateRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/checklist-templates",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.ChecklistTemplate{{Id: 1, Name: "Opening"}}, nil)
				repo.EXPECT().GetChecklistTemplateListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid skip param",
			url:  "/checklist-templates?skip=abc",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "invalid limit param",
			url:  "/checklist-templates?limit=xyz",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/checklist-templates",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistTemplateHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetChecklistTemplateList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistTemplateHandler_GetChecklistTemplateById(t *testing.T) {
	tests := []struct {
		name               string
		checklistTemplateId string
		setupMocks         func(repo *mock.MockChecklistTemplateRepository)
		expectedStatus     int
	}{
		{
			name:               "success",
			checklistTemplateId: "1",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:               "not found",
			checklistTemplateId: "99",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(99)).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:               "invalid id",
			checklistTemplateId: "abc",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistTemplateHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/checklist-templates/"+tt.checklistTemplateId, nil)
			req = mux.SetURLVars(req, map[string]string{"checklistTemplateId": tt.checklistTemplateId})
			w := httptest.NewRecorder()
			handler.GetChecklistTemplateById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistTemplateHandler_CreateChecklistTemplate(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMocks     func(repo *mock.MockChecklistTemplateRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Opening Checklist", "items": [{"name": "Turn on lights", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().CreateChecklistTemplate(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening Checklist"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "success with sub-items",
			body: `{"name": "Closing Checklist", "items": [{"name": "Turn off lights", "displayOrder": 1, "subItems": [{"name": "Bar Lamp", "displayOrder": 1}]}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Closing Checklist").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().CreateChecklistTemplate(gomock.Any(), gomock.Any()).
					Return(domain.ChecklistTemplate{Id: 2, Name: "Closing Checklist"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "empty name validation",
			body: `{"name": "", "items": [{"name": "Item", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "no items validation",
			body: `{"name": "Opening", "items": []}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "duplicate name",
			body: `{"name": "Opening Checklist", "items": [{"name": "Turn on lights", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist").
					Return(domain.ChecklistTemplate{Id: 5, Name: "Opening Checklist"}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistTemplateHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/checklist-templates", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateChecklistTemplate(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistTemplateHandler_UpdateChecklistTemplateById(t *testing.T) {
	tests := []struct {
		name               string
		checklistTemplateId string
		body               string
		setupMocks         func(repo *mock.MockChecklistTemplateRepository)
		expectedStatus     int
	}{
		{
			name:               "success",
			checklistTemplateId: "1",
			body:               `{"name": "Opening Checklist Updated", "items": [{"name": "Turn on lights", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateByName(gomock.Any(), "Opening Checklist Updated").
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound})
				repo.EXPECT().UpdateChecklistTemplateById(gomock.Any(), gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1, Name: "Opening Checklist Updated"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:               "invalid id",
			checklistTemplateId: "abc",
			body:               `{"name": "Opening", "items": [{"name": "Item", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:               "invalid JSON body",
			checklistTemplateId: "1",
			body:               `{invalid`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:               "empty name validation",
			checklistTemplateId: "1",
			body:               `{"name": "", "items": [{"name": "Item", "displayOrder": 1, "subItems": []}]}`,
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistTemplateHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/checklist-templates/"+tt.checklistTemplateId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"checklistTemplateId": tt.checklistTemplateId})
			w := httptest.NewRecorder()
			handler.UpdateChecklistTemplateById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestChecklistTemplateHandler_DeleteChecklistTemplateById(t *testing.T) {
	tests := []struct {
		name               string
		checklistTemplateId string
		setupMocks         func(repo *mock.MockChecklistTemplateRepository)
		expectedStatus     int
	}{
		{
			name:               "success",
			checklistTemplateId: "1",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(1)).
					Return(domain.ChecklistTemplate{Id: 1}, nil)
				repo.EXPECT().DeleteChecklistTemplateById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:               "invalid id",
			checklistTemplateId: "abc",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:               "not found",
			checklistTemplateId: "99",
			setupMocks: func(repo *mock.MockChecklistTemplateRepository) {
				repo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				repo.EXPECT().GetChecklistTemplateById(gomock.Any(), int64(99)).
					Return(domain.ChecklistTemplate{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newChecklistTemplateHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/checklist-templates/"+tt.checklistTemplateId, nil)
			req = mux.SetURLVars(req, map[string]string{"checklistTemplateId": tt.checklistTemplateId})
			w := httptest.NewRecorder()
			handler.DeleteChecklistTemplateById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
