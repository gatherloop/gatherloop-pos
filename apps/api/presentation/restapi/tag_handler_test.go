package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestTagHandler_GetTagList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockTagRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return([]domain.Tag{{Id: 1, Name: "New", Color: domain.TagColorGreen}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTagHandler(domain.NewTagUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tags", nil)
			w := httptest.NewRecorder()
			handler.GetTagList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTagHandler_GetTagById(t *testing.T) {
	tests := []struct {
		name           string
		tagId          string
		setupMock      func(r *mock.MockTagRepository)
		expectedStatus int
	}{
		{
			name:  "success",
			tagId: "1",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(domain.Tag{Id: 1, Name: "New", Color: domain.TagColorGreen}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "not found",
			tagId: "99",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(99)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			tagId:          "abc",
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTagHandler(domain.NewTagUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tags/"+tt.tagId, nil)
			req = mux.SetURLVars(req, map[string]string{"tagId": tt.tagId})
			w := httptest.NewRecorder()
			handler.GetTagById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTagHandler_CreateTag(t *testing.T) {
	existing := []domain.Tag{{Id: 1, Name: "New", Color: domain.TagColorGreen}}

	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockTagRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Best Seller", "color": "orange", "isHighlighted": true, "sortOrder": 2}`,
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existing, nil)
				r.EXPECT().CreateTag(gomock.Any(), domain.Tag{Name: "Best Seller", Color: domain.TagColorOrange, IsHighlighted: true, SortOrder: 2}).
					Return(domain.Tag{Id: 2, Name: "Best Seller", Color: domain.TagColorOrange, IsHighlighted: true, SortOrder: 2}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid json`,
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "duplicate name",
			body: `{"name": "new", "color": "orange", "isHighlighted": false, "sortOrder": 0}`,
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existing, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "unknown color",
			body:           `{"name": "Vegan", "color": "teal", "isHighlighted": false, "sortOrder": 0}`,
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Vegan", "color": "green", "isHighlighted": false, "sortOrder": 0}`,
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existing, nil)
				r.EXPECT().CreateTag(gomock.Any(), gomock.Any()).Return(domain.Tag{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTagHandler(domain.NewTagUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/tags", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateTag(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTagHandler_UpdateTagById(t *testing.T) {
	existing := []domain.Tag{{Id: 1, Name: "New", Color: domain.TagColorGreen}}

	tests := []struct {
		name           string
		tagId          string
		body           string
		setupMock      func(r *mock.MockTagRepository)
		expectedStatus int
	}{
		{
			name:  "success",
			tagId: "1",
			body:  `{"name": "Brand New", "color": "pink", "isHighlighted": false, "sortOrder": 0}`,
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existing, nil)
				r.EXPECT().UpdateTagById(gomock.Any(), domain.Tag{Name: "Brand New", Color: domain.TagColorPink}, int64(1)).
					Return(domain.Tag{Id: 1, Name: "Brand New", Color: domain.TagColorPink}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			tagId:          "abc",
			body:           `{"name": "Brand New", "color": "pink", "isHighlighted": false, "sortOrder": 0}`,
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid JSON body",
			tagId:          "1",
			body:           `{invalid json`,
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:  "not found",
			tagId: "99",
			body:  `{"name": "Brand New", "color": "pink", "isHighlighted": false, "sortOrder": 0}`,
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existing, nil)
				r.EXPECT().UpdateTagById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTagHandler(domain.NewTagUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/tags/"+tt.tagId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"tagId": tt.tagId})
			w := httptest.NewRecorder()
			handler.UpdateTagById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTagHandler_DeleteTagById(t *testing.T) {
	tests := []struct {
		name           string
		tagId          string
		setupMock      func(r *mock.MockTagRepository)
		expectedStatus int
	}{
		{
			name:  "success",
			tagId: "1",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(domain.Tag{Id: 1}, nil)
				r.EXPECT().DeleteTagById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			tagId:          "abc",
			setupMock:      func(r *mock.MockTagRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:  "not found",
			tagId: "99",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(99)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTagHandler(domain.NewTagUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/tags/"+tt.tagId, nil)
			req = mux.SetURLVars(req, map[string]string{"tagId": tt.tagId})
			w := httptest.NewRecorder()
			handler.DeleteTagById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
