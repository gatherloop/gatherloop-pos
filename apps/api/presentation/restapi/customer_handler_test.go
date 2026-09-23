package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newCustomerTestHandler(repo *mock.MockCustomerRepository) restapi.CustomerHandler {
	return restapi.NewCustomerHandler(domain.NewCustomerUsecase(repo))
}

func TestCustomerHandler_GetCurrentCustomer(t *testing.T) {
	whatsappNumber := "6281234567890"

	tests := []struct {
		name                   string
		setupMock              func(r *mock.MockCustomerRepository)
		expectedStatus         int
		expectedName           string
		expectedWhatsappNumber string
	}{
		{
			name: "a session that has ordered before reads back its name and whatsapp number",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).
					Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi", WhatsappNumber: &whatsappNumber}, nil)
			},
			expectedStatus:         http.StatusOK,
			expectedName:           "Budi",
			expectedWhatsappNumber: whatsappNumber,
		},
		{
			name: "a fresh session reads an empty name and whatsapp number, not a 404",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).
					Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus:         http.StatusOK,
			expectedName:           "",
			expectedWhatsappNumber: "",
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).
					Return(domain.Customer{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			repo := mock.NewMockCustomerRepository(ctrl)
			tt.setupMock(repo)

			handler := newCustomerTestHandler(repo)
			req := httptest.NewRequest(http.MethodGet, "/customers/current", nil)
			req.Header.Set("X-Session-Id", testSessionId)
			w := httptest.NewRecorder()
			handler.GetCurrentCustomer(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var resp apiContract.CustomerResponse
				assert.NoError(t, json.NewDecoder(bytes.NewBufferString(w.Body.String())).Decode(&resp))
				assert.Equal(t, tt.expectedName, resp.Data.Name)
				assert.Equal(t, tt.expectedWhatsappNumber, resp.Data.WhatsappNumber)
			}
		})
	}
}

func TestCustomerRoute_RequiresSessionId(t *testing.T) {
	tests := []struct {
		name      string
		sessionId string
	}{
		{name: "missing X-Session-Id", sessionId: ""},
		{name: "malformed X-Session-Id", sessionId: "not-a-uuid"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			repo := mock.NewMockCustomerRepository(ctrl)

			router := mux.NewRouter()
			restapi.NewCustomerRouter(newCustomerTestHandler(repo)).AddRouter(router)

			req := httptest.NewRequest(http.MethodGet, "/customers/current", nil)
			if tt.sessionId != "" {
				req.Header.Set("X-Session-Id", tt.sessionId)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}
