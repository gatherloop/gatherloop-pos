package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestTicketUsecase_GetTicketList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockTicketRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketList(gomock.Any()).Return([]domain.Ticket{
					{Id: 1, Code: "RFID-0001", Name: "Ticket 01"},
					{Id: 2, Code: "RFID-0002", Name: "Ticket 02"},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTicketUsecase(mockRepo)
			tickets, err := usecase.GetTicketList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, tickets, tt.expectedLen)
			}
		})
	}
}

func TestTicketUsecase_GetTicketById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockTicketRepository)
		expectedCode  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketById(gomock.Any(), int64(1)).Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01"}, nil)
			},
			expectedCode: "RFID-0001",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().GetTicketById(gomock.Any(), int64(99)).Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTicketUsecase(mockRepo)
			ticket, err := usecase.GetTicketById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedCode, ticket.Code)
			}
		})
	}
}

func TestTicketUsecase_CreateTicket(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Ticket
		setupMock     func(r *mock.MockTicketRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Ticket{Code: "RFID-0099", Name: "Ticket 99"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0099").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 99").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTicket(gomock.Any(), gomock.Any()).Return(domain.Ticket{Id: 3, Code: "RFID-0099", Name: "Ticket 99"}, nil)
			},
			expectedId: 3,
		},
		{
			name:          "empty code",
			input:         domain.Ticket{Code: "", Name: "Ticket 99"},
			setupMock:     func(r *mock.MockTicketRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "empty name",
			input:         domain.Ticket{Code: "RFID-0099", Name: ""},
			setupMock:     func(r *mock.MockTicketRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate code",
			input: domain.Ticket{Code: "RFID-0001", Name: "Ticket 99"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0001").Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate name",
			input: domain.Ticket{Code: "RFID-0099", Name: "Ticket 01"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0099").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 01").Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "repo error on create",
			input: domain.Ticket{Code: "RFID-0099", Name: "Ticket 99"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0099").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 99").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTicket(gomock.Any(), gomock.Any()).Return(domain.Ticket{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTicketUsecase(mockRepo)
			ticket, err := usecase.CreateTicket(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, ticket.Id)
			}
		})
	}
}

func TestTicketUsecase_UpdateTicketById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Ticket
		setupMock     func(r *mock.MockTicketRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: domain.Ticket{Code: "RFID-0001", Name: "Ticket 01 Renamed"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0001").Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01"}, nil)
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 01 Renamed").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTicketById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01 Renamed"}, nil)
			},
			expectedName: "Ticket 01 Renamed",
		},
		{
			name:          "empty code",
			id:            1,
			input:         domain.Ticket{Code: "", Name: "Ticket 01"},
			setupMock:     func(r *mock.MockTicketRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "empty name",
			id:            1,
			input:         domain.Ticket{Code: "RFID-0001", Name: ""},
			setupMock:     func(r *mock.MockTicketRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate code belongs to another ticket",
			id:    1,
			input: domain.Ticket{Code: "RFID-0002", Name: "Ticket 01"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0002").Return(domain.Ticket{Id: 2, Code: "RFID-0002", Name: "Ticket 02"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "duplicate name belongs to another ticket",
			id:    1,
			input: domain.Ticket{Code: "RFID-0001", Name: "Ticket 02"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0001").Return(domain.Ticket{Id: 1, Code: "RFID-0001", Name: "Ticket 01"}, nil)
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 02").Return(domain.Ticket{Id: 2, Code: "RFID-0002", Name: "Ticket 02"}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Ticket{Code: "RFID-0099", Name: "Ticket 99"},
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetTicketByCode(gomock.Any(), "RFID-0099").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTicketByName(gomock.Any(), "Ticket 99").Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTicketById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Ticket{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTicketUsecase(mockRepo)
			ticket, err := usecase.UpdateTicketById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, ticket.Name)
			}
		})
	}
}

func TestTicketUsecase_DeleteTicketById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockTicketRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().DeleteTicketById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "repository error",
			id:   99,
			setupMock: func(r *mock.MockTicketRepository) {
				r.EXPECT().DeleteTicketById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTicketRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewTicketUsecase(mockRepo)
			err := usecase.DeleteTicketById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
