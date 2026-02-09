package domain

import (
	"apps/api/utils"
	"context"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthUsecase struct {
	repository AuthRepository
}

func NewAuthUsecase(repository AuthRepository) AuthUsecase {
	return AuthUsecase{repository: repository}
}

func (usecase AuthUsecase) Login(ctx context.Context, loginRequest LoginRequest) (string, *Error) {
	user, err := usecase.repository.GetUserByUsername(ctx, loginRequest.Username)
	if err != nil {
		return "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginRequest.Password)); err != nil {
		return "", &Error{Type: BadRequest, Message: "wrong credential"}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.Id,
		"username": user.Username,
	})

	tokenString, tokenError := token.SignedString([]byte(utils.GetEnv().JwtSecret))
	if tokenError != nil {
		return "", &Error{Type: InternalServerError, Message: tokenError.Error()}
	}

	return tokenString, nil
}
