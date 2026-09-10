package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestCustomerUsecase_GetCurrentCustomerName(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		setupMock     func(r *mock.MockCustomerRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:      "returns the name this session gave before",
			sessionId: "session-1",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-1").Return(domain.Customer{Id: 1, SessionId: "session-1", Name: "Budi"}, nil)
			},
			expectedName: "Budi",
		},
		{
			name:      "unknown session returns an empty name, never 404",
			sessionId: "session-2",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-2").Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
			},
			expectedName: "",
		},
		{
			name:      "repository error",
			sessionId: "session-3",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().GetCustomerBySessionId(gomock.Any(), "session-3").Return(domain.Customer{}, &domain.Error{Type: domain.InternalServerError})
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
			name, err := usecase.GetCurrentCustomerName(context.Background(), tt.sessionId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, name)
			}
		})
	}
}

func TestCustomerUsecase_UpsertCustomerName(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		input         string
		setupMock     func(r *mock.MockCustomerRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:      "a valid name is upserted",
			sessionId: "session-1",
			input:     "Budi",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", "Budi").
					Return(domain.Customer{Id: 1, SessionId: "session-1", Name: "Budi"}, nil)
			},
			expectedName: "Budi",
		},
		{
			name:      "surrounding whitespace is trimmed before it is stored",
			sessionId: "session-1",
			input:     "  Budi  ",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", "Budi").
					Return(domain.Customer{Id: 1, SessionId: "session-1", Name: "Budi"}, nil)
			},
			expectedName: "Budi",
		},
		{
			name:          "a whitespace-only name is rejected without touching the repository",
			sessionId:     "session-1",
			input:         "   ",
			setupMock:     func(r *mock.MockCustomerRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "an empty name is rejected without touching the repository",
			sessionId:     "session-1",
			input:         "",
			setupMock:     func(r *mock.MockCustomerRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "a name over 60 characters is rejected rather than truncated",
			sessionId:     "session-1",
			input:         strings.Repeat("a", 61),
			setupMock:     func(r *mock.MockCustomerRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:      "exactly 60 characters is accepted — the ceiling is inclusive",
			sessionId: "session-1",
			input:     strings.Repeat("a", 60),
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", strings.Repeat("a", 60)).
					Return(domain.Customer{Id: 1, SessionId: "session-1", Name: strings.Repeat("a", 60)}, nil)
			},
			expectedName: strings.Repeat("a", 60),
		},
		{
			// VARCHAR(60) under utf8mb4 counts characters, not bytes, so the
			// ceiling has to count runes — a 60-character Indonesian name with
			// accented letters must not be rejected for its byte length.
			name:      "the ceiling counts characters, not bytes",
			sessionId: "session-1",
			input:     strings.Repeat("é", 60),
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", strings.Repeat("é", 60)).
					Return(domain.Customer{Id: 1, SessionId: "session-1", Name: strings.Repeat("é", 60)}, nil)
			},
			expectedName: strings.Repeat("é", 60),
		},
		{
			name:      "a repository error is surfaced",
			sessionId: "session-1",
			input:     "Budi",
			setupMock: func(r *mock.MockCustomerRepository) {
				r.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", "Budi").
					Return(domain.Customer{}, &domain.Error{Type: domain.InternalServerError})
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
			customer, err := usecase.UpsertCustomerName(context.Background(), tt.sessionId, tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, customer.Name)
			}
		})
	}
}
