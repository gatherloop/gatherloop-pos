package main

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/pkg/logger"
	"apps/api/presentation/restapi"
	"apps/api/utils"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
)

func main() {
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
	ticketRepository := mysql.NewTicketRepository(db)
	authRepository := mysql.NewAuthRepository(db)
	calculationRepository := mysql.NewCalculationRepository(db)
	rentalRepository := mysql.NewRentalRepository(db)
	checklistTemplateRepository := mysql.NewChecklistTemplateRepository(db)
	checklistSessionRepository := mysql.NewChecklistSessionRepository(db)
	stockCheckRepository := mysql.NewStockCheckRepository(db)

	walletUsecase := domain.NewWalletUsecase(walletRepository)
	transactionUsecase := domain.NewTransactionUsecase(transactionRepository, variantRepository, couponRepository, walletRepository)
	variantUsecase := domain.NewVariantUsecase(variantRepository, productRepository)
	productUsecase := domain.NewProductUsecase(productRepository)
	materialUsecase := domain.NewMaterialUsecase(materialRepository, supplierRepository)
	supplierUsecase := domain.NewSupplierUsecase(supplierRepository)
	expenseUsecase := domain.NewExpenseUsecase(expenseRepository, budgetRepository, walletRepository)
	categoryUsecase := domain.NewCategoryUsecase(categoryRepository)
	couponUsecase := domain.NewCouponUsecase(couponRepository)
	ticketUsecase := domain.NewTicketUsecase(ticketRepository)
	budgetUsecase := domain.NewBudgetUsecase(budgetRepository)
	authUsecase := domain.NewAuthUsecase(authRepository)
	calculationUsecase := domain.NewCalculationUsecase(calculationRepository, walletRepository)
	rentalUsecase := domain.NewRentalUsecase(rentalRepository, variantRepository, transactionRepository, ticketRepository)
	checklistTemplateUsecase := domain.NewChecklistTemplateUsecase(checklistTemplateRepository)
	checklistSessionUsecase := domain.NewChecklistSessionUsecase(checklistSessionRepository, checklistTemplateRepository)
	stockCheckUsecase := domain.NewStockCheckUsecase(stockCheckRepository, materialRepository)

	walletHandler := restapi.NewWalletHandler(walletUsecase)
	transactionHandler := restapi.NewTransactionHandler(transactionUsecase)
	variantHandler := restapi.NewVariantHandler(variantUsecase)
	productHandler := restapi.NewProductHandler(productUsecase)
	materialHandler := restapi.NewMaterialHandler(materialUsecase)
	supplierHandler := restapi.NewSupplierHandler(supplierUsecase)
	expenseHandler := restapi.NewExpenseHandler(expenseUsecase)
	categoryHandler := restapi.NewCategoryHandler(categoryUsecase)
	couponHandler := restapi.NewCouponHandler(couponUsecase)
	ticketHandler := restapi.NewTicketHandler(ticketUsecase)
	budgetHandler := restapi.NewBudgetHandler(budgetUsecase)
	authHandler := restapi.NewAuthHandler(authUsecase)
	calculationHandler := restapi.NewCalculationHandler(calculationUsecase)
	rentalHandler := restapi.NewRentalHandler(rentalUsecase)
	checklistTemplateHandler := restapi.NewChecklistTemplateHandler(checklistTemplateUsecase)
	checklistSessionHandler := restapi.NewChecklistSessionHandler(checklistSessionUsecase)
	stockCheckHandler := restapi.NewStockCheckHandler(stockCheckUsecase)

	restapi.NewAuthRouter(authHandler).AddRouter(router)
	restapi.NewBudgetRouter(budgetHandler).AddRouter(router)
	restapi.NewCategoryRouter(categoryHandler).AddRouter(router)
	restapi.NewCouponRouter(couponHandler).AddRouter(router)
	restapi.NewTicketRouter(ticketHandler).AddRouter(router)
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
	restapi.NewStockCheckRouter(stockCheckHandler).AddRouter(router)

	startTime := time.Now()
	router.HandleFunc("/health-check", restapi.NewHealthHandler(startTime).HealthCheck)

	srv := &http.Server{
		Addr:              fmt.Sprintf("%s:%s", env.BindAddr, env.Port),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErrCh := make(chan error, 1)
	go func() {
		rootLogger.Info("server listening", slog.String("addr", srv.Addr))
		serveErrCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErrCh:
		if err != nil && err != http.ErrServerClosed {
			rootLogger.Error("server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	case <-ctx.Done():
		stop()
		rootLogger.Info("shutdown signal received, draining in-flight requests")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			rootLogger.Error("graceful shutdown failed", slog.String("error", err.Error()))
			os.Exit(1)
		}

		rootLogger.Info("server shut down cleanly")
	}
}
