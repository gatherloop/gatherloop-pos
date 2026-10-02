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

var existingTags = []domain.Tag{
	{Id: 1, Name: "New", Color: domain.TagColorGreen},
	{Id: 2, Name: "Best Seller", Color: domain.TagColorOrange},
}

func TestTagUsecase_GetTagList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockTagRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			tags, err := domain.NewTagUsecase(mockRepo).GetTagList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, tags, tt.expectedLen)
			}
		})
	}
}

func TestTagUsecase_GetTagById(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockTagRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil)
			},
		},
		{
			name: "not found",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			tag, err := domain.NewTagUsecase(mockRepo).GetTagById(context.Background(), 1)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, "New", tag.Name)
			}
		})
	}
}

func TestTagUsecase_CreateTag(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Tag
		setupMock     func(r *mock.MockTagRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success trims the name",
			input: domain.Tag{Name: "  Vegan  ", Color: domain.TagColorBlue, IsHighlighted: true, SortOrder: 3},
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil)
				r.EXPECT().CreateTag(gomock.Any(), domain.Tag{Name: "Vegan", Color: domain.TagColorBlue, IsHighlighted: true, SortOrder: 3}).
					Return(domain.Tag{Id: 3, Name: "Vegan", Color: domain.TagColorBlue, IsHighlighted: true, SortOrder: 3}, nil)
			},
			expectedName: "Vegan",
		},
		{
			name:          "duplicate name differing only in case",
			input:         domain.Tag{Name: "best seller", Color: domain.TagColorRed},
			setupMock:     func(r *mock.MockTagRepository) { r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil) },
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "unknown color",
			input:         domain.Tag{Name: "Vegan", Color: "teal"},
			setupMock:     func(r *mock.MockTagRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "blank name",
			input:         domain.Tag{Name: "   ", Color: domain.TagColorRed},
			setupMock:     func(r *mock.MockTagRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "name longer than 100 characters",
			input:         domain.Tag{Name: strings.Repeat("a", 101), Color: domain.TagColorRed},
			setupMock:     func(r *mock.MockTagRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "list error",
			input: domain.Tag{Name: "Vegan", Color: domain.TagColorRed},
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name:  "create error",
			input: domain.Tag{Name: "Vegan", Color: domain.TagColorRed},
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil)
				r.EXPECT().CreateTag(gomock.Any(), gomock.Any()).Return(domain.Tag{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			tag, err := domain.NewTagUsecase(mockRepo).CreateTag(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, tag.Name)
			}
		})
	}
}

func TestTagUsecase_UpdateTagById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Tag
		setupMock     func(r *mock.MockTagRepository)
		expectedError *domain.Error
	}{
		{
			name:  "success keeping its own name",
			id:    1,
			input: domain.Tag{Name: "new", Color: domain.TagColorPurple, SortOrder: 5},
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil)
				r.EXPECT().UpdateTagById(gomock.Any(), domain.Tag{Name: "new", Color: domain.TagColorPurple, SortOrder: 5}, int64(1)).
					Return(domain.Tag{Id: 1, Name: "new", Color: domain.TagColorPurple, SortOrder: 5}, nil)
			},
		},
		{
			name:          "name taken by another tag",
			id:            1,
			input:         domain.Tag{Name: "BEST SELLER", Color: domain.TagColorPurple},
			setupMock:     func(r *mock.MockTagRepository) { r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil) },
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "unknown color",
			id:            1,
			input:         domain.Tag{Name: "New", Color: "teal"},
			setupMock:     func(r *mock.MockTagRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Tag{Name: "Vegan", Color: domain.TagColorGreen},
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagList(gomock.Any()).Return(existingTags, nil)
				r.EXPECT().UpdateTagById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			tag, err := domain.NewTagUsecase(mockRepo).UpdateTagById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.id, tag.Id)
			}
		})
	}
}

func TestTagUsecase_DeleteTagById(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockTagRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil)
				r.EXPECT().DeleteTagById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockTagRepository) {
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil)
				r.EXPECT().DeleteTagById(gomock.Any(), int64(1)).Return(&domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			err := domain.NewTagUsecase(mockRepo).DeleteTagById(context.Background(), 1)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func runTransactionCallback(r *mock.MockTagRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, callback func(context.Context) *domain.Error) *domain.Error {
			return callback(ctx)
		})
}

func TestTagUsecase_SetTagVariants(t *testing.T) {
	pair := func(variantId int64) domain.VariantTagPair {
		return domain.VariantTagPair{VariantId: variantId, TagId: 1}
	}

	tests := []struct {
		name          string
		variantIds    []int64
		setupMock     func(r *mock.MockTagRepository)
		expectedError *domain.Error
	}{
		{
			name:       "replace diffs the set and only touches changed pairs",
			variantIds: []int64{2, 3},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil).Times(2)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{2, 3}).Return([]int64{2, 3}, nil)
				r.EXPECT().GetTagVariantIds(gomock.Any(), int64(1)).Return([]int64{1, 2}, nil)
				r.EXPECT().DeleteVariantTags(gomock.Any(), []domain.VariantTagPair{pair(1)}).Return(nil)
				r.EXPECT().InsertVariantTags(gomock.Any(), []domain.VariantTagPair{pair(3)}).Return(nil)
			},
		},
		{
			name:       "empty set clears every assignment",
			variantIds: []int64{},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil).Times(2)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{}).Return([]int64{}, nil)
				r.EXPECT().GetTagVariantIds(gomock.Any(), int64(1)).Return([]int64{1, 2}, nil)
				r.EXPECT().DeleteVariantTags(gomock.Any(), []domain.VariantTagPair{pair(1), pair(2)}).Return(nil)
			},
		},
		{
			name:       "unchanged set writes nothing",
			variantIds: []int64{1, 2},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil).Times(2)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{1, 2}).Return([]int64{1, 2}, nil)
				r.EXPECT().GetTagVariantIds(gomock.Any(), int64(1)).Return([]int64{1, 2}, nil)
			},
		},
		{
			name:       "duplicate ids are collapsed",
			variantIds: []int64{2, 2},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil).Times(2)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{2}).Return([]int64{2}, nil)
				r.EXPECT().GetTagVariantIds(gomock.Any(), int64(1)).Return([]int64{}, nil)
				r.EXPECT().InsertVariantTags(gomock.Any(), []domain.VariantTagPair{pair(2)}).Return(nil)
			},
		},
		{
			name:       "unknown or deleted variant id is rejected without writes",
			variantIds: []int64{2, 99},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{2, 99}).Return([]int64{2}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "tag not found",
			variantIds: []int64{2},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(domain.Tag{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:       "repository error while inserting",
			variantIds: []int64{2},
			setupMock: func(r *mock.MockTagRepository) {
				runTransactionCallback(r)
				r.EXPECT().GetTagById(gomock.Any(), int64(1)).Return(existingTags[0], nil)
				r.EXPECT().GetLiveVariantIds(gomock.Any(), []int64{2}).Return([]int64{2}, nil)
				r.EXPECT().GetTagVariantIds(gomock.Any(), int64(1)).Return([]int64{}, nil)
				r.EXPECT().InsertVariantTags(gomock.Any(), gomock.Any()).Return(&domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockTagRepository(ctrl)
			tt.setupMock(mockRepo)

			tag, err := domain.NewTagUsecase(mockRepo).SetTagVariants(context.Background(), 1, tt.variantIds)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, int64(1), tag.Id)
			}
		})
	}
}
