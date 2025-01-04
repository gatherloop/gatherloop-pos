package auth

import (
	"apps/api/utils"
	"context"
	"errors"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) Login(ctx context.Context, loginRequest LoginRequest) (string, error) {
	user, err := usecase.repository.GetUserByUsername(ctx, loginRequest.Username)
	if err != nil {
		return "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginRequest.Password)); err != nil {
		return "", errors.New("wrong credential")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.Id,
		"username": user.Username,
	})

	println(utils.GetEnv().JwtSecret)

	tokenString, err := token.SignedString([]byte(utils.GetEnv().JwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
