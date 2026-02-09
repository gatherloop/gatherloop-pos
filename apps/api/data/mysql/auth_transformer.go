package mysql

import "apps/api/domain"

func ToUserDB(domainUser domain.User) User {
	return User{
		Id:        domainUser.Id,
		Username:  domainUser.Username,
		Password:  domainUser.Password,
		CreatedAt: domainUser.CreatedAt,
		DeletedAt: domainUser.DeletedAt,
	}
}

func ToUserDomain(dbUser User) domain.User {
	return domain.User{
		Id:        dbUser.Id,
		Username:  dbUser.Username,
		Password:  dbUser.Password,
		CreatedAt: dbUser.CreatedAt,
		DeletedAt: dbUser.DeletedAt,
	}
}
