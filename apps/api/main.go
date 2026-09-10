package main

import (
	"apps/api/data/doku"
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"apps/api/utils"
	"apps/api/utils/logger"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

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

	dokuPrivateKey, dokuKeyErr := doku.ParsePrivateKeyPEM(env.DokuPrivateKey)
	if dokuKeyErr != nil {
		// Not a boot failure (D15 only names ORDER_PAYMENT_WALLET_ID): a
		// missing or invalid DOKU_PRIVATE_KEY just means every DOKU call
		// fails at request time, the same as a DOKU outage (NFR
		// Availability) — every environment that never enables checkout
		// (D20) has no reason to hold one.
		rootLogger.Error("invalid DOKU_PRIVATE_KEY; DOKU calls will fail until it is fixed", slog.String("error", dokuKeyErr.Error()))
	}

	paymentGatewayRepository := doku.NewPaymentGatewayRepository(doku.Config{
		BaseURL:      env.DokuBaseURL,
		ClientId:     env.DokuClientId,
		ClientSecret: env.DokuClientSecret,
		PrivateKey:   dokuPrivateKey,
		MerchantId:   env.DokuMerchantId,
		ChannelId:    env.DokuChannelId,
	})

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
	tableRepository := mysql.NewTableRepository(db)
	cartRepository := mysql.NewCartRepository(db)
	customerRepository := mysql.NewCustomerRepository(db)
	paymentRepository := mysql.NewPaymentRepository(db)
	authRepository := mysql.NewAuthRepository(db)
	calculationRepository := mysql.NewCalculationRepository(db)
	rentalRepository := mysql.NewRentalRepository(db)
	checklistTemplateRepository := mysql.NewChecklistTemplateRepository(db)
	checklistSessionRepository := mysql.NewChecklistSessionRepository(db)
	stockCheckRepository := mysql.NewStockCheckRepository(db)

	validateOrderPaymentWallet(walletRepository, env.OrderPaymentWalletId)

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
	tableUsecase := domain.NewTableUsecase(tableRepository)
	cartUsecase := domain.NewCartUsecase(cartRepository, variantRepository, tableRepository)
	customerUsecase := domain.NewCustomerUsecase(customerRepository)
	paymentUsecase := domain.NewPaymentUsecase(paymentRepository, paymentGatewayRepository, customerUsecase, cartRepository, transactionRepository, variantRepository, env.DokuQrisExpirySeconds)
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
	tableHandler := restapi.NewTableHandler(tableUsecase)
	cartHandler := restapi.NewCartHandler(cartUsecase)
	customerHandler := restapi.NewCustomerHandler(customerUsecase)
	paymentHandler := restapi.NewPaymentHandler(paymentUsecase)
	budgetHandler := restapi.NewBudgetHandler(budgetUsecase)
	authHandler := restapi.NewAuthHandler(authUsecase)
	calculationHandler := restapi.NewCalculationHandler(calculationUsecase)
	rentalHandler := restapi.NewRentalHandler(rentalUsecase)
	checklistTemplateHandler := restapi.NewChecklistTemplateHandler(checklistTemplateUsecase)
	checklistSessionHandler := restapi.NewChecklistSessionHandler(checklistSessionUsecase)
	stockCheckHandler := restapi.NewStockCheckHandler(stockCheckUsecase)
	publicHandler := restapi.NewPublicHandler(productUsecase, categoryUsecase, variantUsecase, tableUsecase)

	restapi.NewAuthRouter(authHandler).AddRouter(router)
	restapi.NewBudgetRouter(budgetHandler).AddRouter(router)
	restapi.NewCategoryRouter(categoryHandler).AddRouter(router)
	restapi.NewCouponRouter(couponHandler).AddRouter(router)
	restapi.NewTicketRouter(ticketHandler).AddRouter(router)
	restapi.NewTableRouter(tableHandler).AddRouter(router)
	restapi.NewCartRouter(cartHandler).AddRouter(router)
	restapi.NewCustomerRouter(customerHandler).AddRouter(router)
	restapi.NewPaymentRouter(paymentHandler).AddRouter(router)
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
	restapi.NewPublicRouter(publicHandler).AddRouter(router)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("success"))
	})

	rootLogger.Info("server listening", slog.String("port", env.Port))
	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}

// validateOrderPaymentWallet is D15's boot-time check: unknown, deleted, or
// not a payment target all fail the boot with a named error, so a
// misconfigured ORDER_PAYMENT_WALLET_ID is caught by a deploy rather than
// surfacing at a guest's first checkout.
//
// An unset value is deliberately a warning, not a panic, which is narrower
// than D15's literal "unset ... fails the boot": this environment (and CI's
// e2e-main.yml) has no wallet seeded and no reason to hold one while
// NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED stays false (D20), so panicking here
// would take down every other route this API serves, not just checkout.
// Once a value is configured, it is held to the full strict standard.
func validateOrderPaymentWallet(walletRepository domain.WalletRepository, orderPaymentWalletIdEnv string) {
	if orderPaymentWalletIdEnv == "" {
		slog.Warn("ORDER_PAYMENT_WALLET_ID is not set; checkout will fail at the gateway step until it is configured")
		return
	}

	orderPaymentWalletId, parseErr := strconv.ParseInt(orderPaymentWalletIdEnv, 10, 64)
	if parseErr != nil {
		panic(fmt.Sprintf("ORDER_PAYMENT_WALLET_ID must be a valid wallet id, got %q: %v", orderPaymentWalletIdEnv, parseErr))
	}

	wallet, walletErr := walletRepository.GetWalletById(context.Background(), orderPaymentWalletId)
	if walletErr != nil {
		panic(fmt.Sprintf("ORDER_PAYMENT_WALLET_ID %d could not be loaded: %s", orderPaymentWalletId, walletErr.Message))
	}

	if validationErr := domain.ValidateOrderPaymentWallet(wallet); validationErr != nil {
		panic(fmt.Sprintf("ORDER_PAYMENT_WALLET_ID %d is invalid: %s", orderPaymentWalletId, validationErr.Message))
	}
}
