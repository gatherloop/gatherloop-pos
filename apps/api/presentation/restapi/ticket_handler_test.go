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

func TestTicketHandler_GetTicketList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockTicketRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketList(gomock.Any()).Return([]domain.Ticket{{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTicketHandler(domain.NewTicketUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tickets", nil)
			w := httptest.NewRecorder()
			handler.GetTicketList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTicketHandler_GetTicketById(t *testing.T) {
	tests := []struct {
		name           string
		ticketId       string
		setupMock      func(r *mock.MockTicketRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			ticketId: "1",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketById(gomock.Any(), int64(1)).Return(domain.Ticket{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "not found",
			ticketId: "99",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketById(gomock.Any(), int64(99)).Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			ticketId:       "abc",
			setupMock:      func(r *mock.MockTicketRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTicketHandler(domain.NewTicketUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tickets/"+tt.ticketId, nil)
			req = mux.SetURLVars(req, map[string]string{"ticketId": tt.ticketId})
			w := httptest.NewRecorder()
			handler.GetTicketById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTicketHandler_CreateTicket(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockTicketRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"code": "0xA3F19C82", "name": "Ticket 01"}`,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "0xA3F19C82").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 01").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTicket(gomock.Any(), gomock.Any()).Return(domain.Ticket{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockTicketRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "duplicate code",
			body: `{"code": "0xA3F19C82", "name": "Ticket 01"}`,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "0xA3F19C82").Return(domain.Ticket{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01"}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTicketHandler(domain.NewTicketUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/tickets", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateTicket(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTicketHandler_UpdateTicketById(t *testing.T) {
	tests := []struct {
		name           string
		ticketId       string
		body           string
		setupMock      func(r *mock.MockTicketRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			ticketId: "1",
			body:     `{"code": "0xA3F19C82", "name": "Ticket 01 Renamed"}`,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "0xA3F19C82").Return(domain.Ticket{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01"}, nil)
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 01 Renamed").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTicketById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Ticket{Id: 1, Code: "0xA3F19C82", Name: "Ticket 01 Renamed"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			ticketId:       "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockTicketRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid JSON body",
			ticketId:       "1",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockTicketRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			ticketId: "99",
			body:     `{"code": "0xA3F19C82", "name": "Ticket 99"}`,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "0xA3F19C82").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 99").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTicketById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTicketHandler(domain.NewTicketUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/tickets/"+tt.ticketId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"ticketId": tt.ticketId})
			w := httptest.NewRecorder()
			handler.UpdateTicketById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTicketHandler_DeleteTicketById(t *testing.T) {
	tests := []struct {
		name           string
		ticketId       string
		setupMock      func(r *mock.MockTicketRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			ticketId: "1",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().DeleteTicketById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			ticketId:       "abc",
			setupMock:      func(r *mock.MockTicketRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			ticketId: "99",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().DeleteTicketById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTicketHandler(domain.NewTicketUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/tickets/"+tt.ticketId, nil)
			req = mux.SetURLVars(req, map[string]string{"ticketId": tt.ticketId})
			w := httptest.NewRecorder()
			handler.DeleteTicketById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
