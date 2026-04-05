package main

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/migrations"
	"apps/api/pkg/logger"
	"apps/api/pkg/migrator"
	"apps/api/presentation/restapi"
	"apps/api/seeds"
	"apps/api/utils"
	"flag"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	migrateOnly := flag.Bool("migrate-only", false, "run database migrations and exit")
	seedFlag := flag.Bool("seed", false, "run database migrations then seeders and exit")
	flag.Parse()

	err := utils.LoadEnv()

	env := utils.GetEnv()

	rootLogger := logger.New(env.ServiceName, env.AppEnv, env.LogLevel)
	slog.SetDefault(rootLogger)

	if err == nil {
		rootLogger.Info("loaded .env file")
	}

	rootLogger.Info("server starting",
		slog.String("port", env.Port),
		slog.String("env", env.AppEnv),
	)

	// Run database migrations before connecting the application.
	rootLogger.Info("running database migrations")
	if err := migrator.Run(migrator.Params{
		DbUsername:   env.DbUsername,
		DbPassword:   env.DbPassword,
		DbHost:       env.DbHost,
		DbPort:       env.DbPort,
		DbName:       env.DbName,
		MigrationsFS: migrations.FS,
	}); err != nil {
		panic(fmt.Sprintf("failed to run migrations: %v", err))
	}

	if *migrateOnly {
		rootLogger.Info("--migrate-only flag set, exiting after migrations")
		return
	}

	db, err := mysql.ConnectDB(mysql.ConnectDBParams{
		DbUsername: env.DbUsername,
		DbPassword: env.DbPassword,
		DbHost:     env.DbHost,
		DbPort:     env.DbPort,
		DbName:     env.DbName,
	})
	if err != nil {
		panic("failed to connect database")
	}

	if *seedFlag {
		rootLogger.Info("--seed flag set, running seeders")
		if err := seeds.RunAll(db, seeds.All()); err != nil {
			panic(fmt.Sprintf("failed to run seeders: %v", err))
		}
		rootLogger.Info("seeders completed successfully")
		return
	}

	router := mux.NewRouter().StrictSlash(true)
	router.Use(restapi.EnableCORS)
	router.Use(logger.RequestLogger(rootLogger))

	walletRepository := mysql.NewWalletRepository(db)
	variantRepository := mysql.NewVariantRepository(db)
	productRepository := mysql.NewProductRepository(db)
	budgetRepository := mysql.NewBudgetRepository(db)
	transactionRepository := mysql.NewTransactionRepository(db)
	materialRepository := mysql.NewMaterialRepository(db)
	supplierRepository := mysql.NewSupplierRepository(db)
	expenseRepository := mysql.NewExpenseRepository(db)
	categoryRepository := mysql.NewCategoryRepository(db)
	couponRepository := mysql.NewCouponRepository(db)
	authRepository := mysql.NewAuthRepository(db)
	calculationRepository := mysql.NewCalculationRepository(db)
	rentalRepository := mysql.NewRentalRepository(db)
	checklistTemplateRepository := mysql.NewChecklistTemplateRepository(db)
	checklistSessionRepository := mysql.NewChecklistSessionRepository(db)

	walletUsecase := domain.NewWalletUsecase(walletRepository)
	transactionUsecase := domain.NewTransactionUsecase(transactionRepository, variantRepository, couponRepository, walletRepository, budgetRepository)
	variantUsecase := domain.NewVariantUsecase(variantRepository)
	productUsecase := domain.NewProductUsecase(productRepository)
	materialUsecase := domain.NewMaterialUsecase(materialRepository)
	supplierUsecase := domain.NewSupplierUsecase(supplierRepository)
	expenseUsecase := domain.NewExpenseUsecase(expenseRepository, budgetRepository, walletRepository)
	categoryUsecase := domain.NewCategoryUsecase(categoryRepository)
	couponUsecase := domain.NewCouponUsecase(couponRepository)
	budgetUsecase := domain.NewBudgetUsecase(budgetRepository)
	authUsecase := domain.NewAuthUsecase(authRepository)
	calculationUsecase := domain.NewCalculationUsecase(calculationRepository, walletRepository)
	rentalUsecase := domain.NewRentalUsecase(rentalRepository, variantRepository, transactionRepository)
	checklistTemplateUsecase := domain.NewChecklistTemplateUsecase(checklistTemplateRepository)
	checklistSessionUsecase := domain.NewChecklistSessionUsecase(checklistSessionRepository, checklistTemplateRepository)

	walletHandler := restapi.NewWalletHandler(walletUsecase)
	transactionHandler := restapi.NewTransactionHandler(transactionUsecase)
	variantHandler := restapi.NewVariantHandler(variantUsecase)
	productHandler := restapi.NewProductHandler(productUsecase)
	materialHandler := restapi.NewMaterialHandler(materialUsecase)
	supplierHandler := restapi.NewSupplierHandler(supplierUsecase)
	expenseHandler := restapi.NewExpenseHandler(expenseUsecase)
	categoryHandler := restapi.NewCategoryHandler(categoryUsecase)
	couponHandler := restapi.NewCouponHandler(couponUsecase)
	budgetHandler := restapi.NewBudgetHandler(budgetUsecase)
	authHandler := restapi.NewAuthHandler(authUsecase)
	calculationHandler := restapi.NewCalculationHandler(calculationUsecase)
	rentalHandler := restapi.NewRentalHandler(rentalUsecase)
	checklistTemplateHandler := restapi.NewChecklistTemplateHandler(checklistTemplateUsecase)
	checklistSessionHandler := restapi.NewChecklistSessionHandler(checklistSessionUsecase)

	restapi.NewAuthRouter(authHandler).AddRouter(router)
	restapi.NewBudgetRouter(budgetHandler).AddRouter(router)
	restapi.NewCategoryRouter(categoryHandler).AddRouter(router)
	restapi.NewCouponRouter(couponHandler).AddRouter(router)
	restapi.NewExpenseRouter(expenseHandler).AddRouter(router)
	restapi.NewMaterialRouter(materialHandler).AddRouter(router)
	restapi.NewSupplierRouter(supplierHandler).AddRouter(router)
	restapi.NewVariantRouter(variantHandler).AddRouter(router)
	restapi.NewProductRouter(productHandler).AddRouter(router)
	restapi.NewTransactionRouter(transactionHandler).AddRouter(router)
	restapi.NewWalletRouter(walletHandler).AddRouter(router)
	restapi.NewCalculationRouter(calculationHandler).AddRouter(router)
	restapi.NewRentalRouter(rentalHandler).AddRouter(router)
	restapi.NewChecklistTemplateRouter(checklistTemplateHandler).AddRouter(router)
	restapi.NewChecklistSessionRouter(checklistSessionHandler).AddRouter(router)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("health check success"))
	})

	rootLogger.Info("server listening", slog.String("port", env.Port))
	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
