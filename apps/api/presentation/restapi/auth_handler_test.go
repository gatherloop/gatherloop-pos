package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthHandler_Login(t *testing.T) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.DefaultCost)

	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockAuthRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"username": "admin", "password": "secret"}`,
			setupMock: func(r *mock.MockAuthRepository) {
				r.EXPECT().GetUserByUsername(gomock.Any(), "admin").Return(domain.User{Id: 1, Username: "admin", Password: string(hashedPassword)}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockAuthRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "user not found",
			body: `{"username": "unknown", "password": "secret"}`,
			setupMock: func(r *mock.MockAuthRepository) {
				r.EXPECT().GetUserByUsername(gomock.Any(), "unknown").Return(domain.User{}, &domain.Error{Type: domain.NotFound, Message: "user not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockAuthRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewAuthHandler(domain.NewAuthUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.Login(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestAuthHandler_Logout(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockRepo := mock.NewMockAuthRepository(ctrl)
	handler := restapi.NewAuthHandler(domain.NewAuthUsecase(mockRepo))
	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	w := httptest.NewRecorder()
	handler.Logout(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}
