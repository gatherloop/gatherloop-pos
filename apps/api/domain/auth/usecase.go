package auth

import (
	"apps/api/domain/base"
	"apps/api/utils"
	"context"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) Login(ctx context.Context, loginRequest LoginRequest) (string, *base.Error) {
	user, err := usecase.repository.GetUserByUsername(ctx, loginRequest.Username)
	if err != nil {
		return "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginRequest.Password)); err != nil {
		return "", &base.Error{Type: base.BadRequest, Message: "wrong credential"}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.Id,
		"username": user.Username,
	})

	tokenString, tokenError := token.SignedString([]byte(utils.GetEnv().JwtSecret))
	if tokenError != nil {
		return "", &base.Error{Type: base.InternalServerError, Message: tokenError.Error()}
	}

	return tokenString, nil
}
