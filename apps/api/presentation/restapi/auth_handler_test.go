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

// Login and Logout must clear the same cookie: a browser only ever sends
// Origin on state-changing requests, never on the plain GET /auth/logout
// makes, so deriving the cookie's Domain from Origin (rather than Host,
// which is always present) leaves Logout clearing a cookie scoped
// differently than the one Login set — the actual cookie survives the
// "clear".
func TestAuthHandler_LoginAndLogout_SetSameCookieDomain(t *testing.T) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.DefaultCost)

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()
	mockRepo := mock.NewMockAuthRepository(ctrl)
	mockRepo.EXPECT().GetUserByUsername(gomock.Any(), "admin").Return(domain.User{Id: 1, Username: "admin", Password: string(hashedPassword)}, nil)
	handler := restapi.NewAuthHandler(domain.NewAuthUsecase(mockRepo))

	loginReq := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(`{"username": "admin", "password": "secret"}`))
	loginReq.Host = "localhost:3000"
	loginReq.Header.Set("Content-Type", "application/json")
	loginReq.Header.Set("Origin", "http://localhost:3000")
	loginW := httptest.NewRecorder()
	handler.Login(loginW, loginReq)
	loginCookies := loginW.Result().Cookies()
	if !assert.Len(t, loginCookies, 1) {
		return
	}

	// No Origin header: matches what browsers actually send on a plain GET.
	logoutReq := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	logoutReq.Host = "localhost:3000"
	logoutW := httptest.NewRecorder()
	handler.Logout(logoutW, logoutReq)
	logoutCookies := logoutW.Result().Cookies()
	if !assert.Len(t, logoutCookies, 1) {
		return
	}

	assert.Equal(t, loginCookies[0].Domain, logoutCookies[0].Domain)
	assert.NotEmpty(t, logoutCookies[0].Domain)
}
