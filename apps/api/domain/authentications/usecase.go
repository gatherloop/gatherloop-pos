package authentications

import (
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
	bytes, err := bcrypt.GenerateFromPassword([]byte(loginRequest.Password), 14)
	if err != nil {
		return "", err
	}

	hash := string(bytes)
	user, err := usecase.repository.GetUserByUsername(ctx, loginRequest.Username)
	if err != nil {
		return "", err
	}

	if user.Password != hash {
		return "", errors.New("wrong credential")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": user.Username,
	})

	tokenString, err := token.SignedString([]byte("my_secret_key"))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
