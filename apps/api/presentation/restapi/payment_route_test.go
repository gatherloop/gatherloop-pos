package restapi_test

import (
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

// D13: the checkout route is the first in this codebase to accept anything like a photo, so it
// gets an outer 2 MiB MaxBytesReader guard on top of ValidateVerificationPhoto's own 1 MiB cap on
// the decoded bytes.
func TestPaymentRoute_ChecoutBodyOverTheCapIsRejected(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	m := newPaymentHandlerMocks(ctrl)
	handler := m.handler()

	router := mux.NewRouter()
	restapi.NewPaymentRouter(handler).AddRouter(router)

	oversizedBody := bytes.Repeat([]byte("a"), 3*1024*1024)
	req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", bytes.NewReader(oversizedBody))
	req.Header.Set("X-Session-Id", testSessionId)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
