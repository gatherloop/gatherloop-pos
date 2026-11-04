package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestCustomerUsecase_GetCurrentCustomer(t *testing.T) {
	whatsappNumber := "6281234567890"

	tests := []struct {
		name           string
		sessionId      string
		setupMock      func(r *mock.MockCustomerRepository)
		expectedResult domain.Customer
		expectedError  *domain.Error
	}{
		{
			name:      "returns the name and whatsapp number this session gave before",
			sessionId: "session-1",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-1").Return(domain.Customer{Id: 1, SessionId: "session-1", Name: "Budi", WhatsappNumber: &whatsappNumber}, nil)
			},
			expectedResult: domain.Customer{Id: 1, SessionId: "session-1", Name: "Budi", WhatsappNumber: &whatsappNumber},
		},
		{
			name:      "a session that never gave a whatsapp number reads a nil one",
			sessionId: "session-2",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-2").Return(domain.Customer{Id: 2, SessionId: "session-2", Name: "Budi"}, nil)
			},
			expectedResult: domain.Customer{Id: 2, SessionId: "session-2", Name: "Budi"},
		},
		{
			name:      "unknown session returns an empty customer, never 404",
			sessionId: "session-3",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-3").Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
			},
			expectedResult: domain.Customer{},
		},
		{
			name:      "repository error",
			sessionId: "session-4",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-4").Return(domain.Customer{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			repo := mock.NewMockCustomerRepository(ctrl)
			tt.setupMock(repo)

			usecase := domain.NewCustomerUsecase(repo)
			customer, err := usecase.GetCurrentCustomer(context.Background(), tt.sessionId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedResult, customer)
			}
		})
	}
}
