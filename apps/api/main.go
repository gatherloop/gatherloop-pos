package main

import (
	"apps/api/data/doku"
	"apps/api/data/expopush"
	"apps/api/data/fonnte"
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"apps/api/utils"
	"apps/api/utils/logger"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
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

	dokuPrivateKey, err := doku.ParsePrivateKeyPEM(env.DokuPrivateKey)
	if err != nil {
		rootLogger.Error("failed to parse doku private key", slog.Any("error", err))
		panic("failed to parse doku private key")
	}

	dokuConfig := doku.Config{
		BaseURL:      env.DokuBaseURL,
		ClientId:     env.DokuClientId,
		ClientSecret: env.DokuClientSecret,
		PrivateKey:   dokuPrivateKey,
		MerchantId:   env.DokuMerchantId,
		ChannelId:    env.DokuChannelId,
		TerminalId:   env.DokuTerminalId,
		PostalCode:   env.DokuPostalCode,
		FeeType:      env.DokuFeeType,
	}
	if err := dokuConfig.Validate(); err != nil {
		rootLogger.Error("invalid doku configuration", slog.Any("error", err))
		panic("invalid doku configuration")
	}

	paymentGatewayRepository := doku.NewPaymentGatewayRepository(dokuConfig)

	expoPushConfig := expopush.Config{AccessToken: env.ExpoPushAccessToken}
	if err := expoPushConfig.Validate(); err != nil {
		rootLogger.Warn("expo push gateway not configured; KDS notifications will fail", slog.Any("error", err))
	}

	kdsPushGatewayRepository := expopush.NewKdsPushGatewayRepository(expoPushConfig)

	// D10/D11: an unconfigured token or a missing ORDER_WEB_BASE_URL both boot a disabled
	// gateway, which records every guest notification 'skipped' rather than failing to send.
	fonnteConfig := fonnte.Config{Token: env.FonnteToken, BaseURL: env.FonnteBaseURL}
	var whatsappGatewayRepository domain.WhatsAppGatewayRepository
	if err := fonnteConfig.Validate(); err != nil {
		rootLogger.Warn("whatsapp gateway not configured; guest notifications will be skipped", slog.Any("error", err))
		whatsappGatewayRepository = fonnte.NewDisabledWhatsAppGateway()
	} else if env.OrderWebBaseURL == "" {
		rootLogger.Warn("ORDER_WEB_BASE_URL not configured; guest notifications will be skipped")
		whatsappGatewayRepository = fonnte.NewDisabledWhatsAppGateway()
	} else {
		whatsappGatewayRepository = fonnte.NewWhatsAppGatewayRepository(fonnteConfig)
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
	availabilityReservationRepository := mysql.NewAvailabilityReservationRepository(db)
	availabilityRepository := mysql.NewAvailabilityRepository(db)
	kdsDeviceRepository := mysql.NewKdsDeviceRepository(db)
	kdsNotificationRepository := mysql.NewKdsNotificationRepository(db)
	guestNotificationRepository := mysql.NewGuestNotificationRepository(db)

	orderPaymentWalletId, _ := strconv.ParseInt(env.OrderPaymentWalletId, 10, 64)

	kdsNotificationUsecase := domain.NewKdsNotificationUsecase(kdsNotificationRepository, kdsDeviceRepository, transactionRepository, kdsPushGatewayRepository, env.KdsPushSound)
	guestNotificationUsecase := domain.NewGuestNotificationUsecase(guestNotificationRepository, transactionRepository, paymentRepository, whatsappGatewayRepository, env.OrderWebBaseURL)

	availabilityReservation := domain.NewAvailabilityReservation(availabilityReservationRepository)
	walletUsecase := domain.NewWalletUsecase(walletRepository)
	transactionUsecase := domain.NewTransactionUsecase(transactionRepository, variantRepository, couponRepository, walletRepository, availabilityReservation, kdsNotificationRepository, kdsNotificationUsecase, paymentRepository, guestNotificationRepository, guestNotificationUsecase, cartRepository)
	variantUsecase := domain.NewVariantUsecase(variantRepository, productRepository)
	productUsecase := domain.NewProductUsecase(productRepository, variantRepository)
	materialUsecase := domain.NewMaterialUsecase(materialRepository, supplierRepository)
	supplierUsecase := domain.NewSupplierUsecase(supplierRepository)
	expenseUsecase := domain.NewExpenseUsecase(expenseRepository, budgetRepository, walletRepository)
	categoryUsecase := domain.NewCategoryUsecase(categoryRepository)
	couponUsecase := domain.NewCouponUsecase(couponRepository)
	ticketUsecase := domain.NewTicketUsecase(ticketRepository)
	tableUsecase := domain.NewTableUsecase(tableRepository)
	cartUsecase := domain.NewCartUsecase(cartRepository, variantRepository, tableRepository, paymentRepository)
	customerUsecase := domain.NewCustomerUsecase(customerRepository)
	paymentUsecase := domain.NewPaymentUsecase(paymentRepository, paymentGatewayRepository, customerRepository, cartRepository, transactionRepository, variantRepository, walletRepository, availabilityReservation, kdsNotificationRepository, kdsNotificationUsecase, env.DokuQrisExpirySeconds, env.CashPaymentExpirySeconds, orderPaymentWalletId)
	budgetUsecase := domain.NewBudgetUsecase(budgetRepository)
	authUsecase := domain.NewAuthUsecase(authRepository)
	calculationUsecase := domain.NewCalculationUsecase(calculationRepository, walletRepository)
	rentalUsecase := domain.NewRentalUsecase(rentalRepository, variantRepository, transactionRepository, ticketRepository)
	checklistTemplateUsecase := domain.NewChecklistTemplateUsecase(checklistTemplateRepository)
	checklistSessionUsecase := domain.NewChecklistSessionUsecase(checklistSessionRepository, checklistTemplateRepository)
	stockCheckUsecase := domain.NewStockCheckUsecase(stockCheckRepository, materialRepository)
	availabilityUsecase := domain.NewAvailabilityUsecase(availabilityRepository, productRepository, variantRepository)
	kdsDeviceUsecase := domain.NewKdsDeviceUsecase(kdsDeviceRepository, kdsPushGatewayRepository, env.KdsPushSound)

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
	availabilityHandler := restapi.NewAvailabilityHandler(availabilityUsecase)
	publicHandler := restapi.NewPublicHandler(productUsecase, categoryUsecase, variantUsecase, tableUsecase)
	kdsDeviceHandler := restapi.NewKdsDeviceHandler(kdsDeviceUsecase)

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
	restapi.NewAvailabilityRouter(availabilityHandler).AddRouter(router)
	restapi.NewPublicRouter(publicHandler).AddRouter(router)
	restapi.NewKdsDeviceRouter(kdsDeviceHandler).AddRouter(router)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("success"))
	})

	// FR-4/D5: the sweeper that catches a crash, a deploy or a push-service outage — the
	// post-commit goroutine kick in payTransaction's and CompleteTransaction's callers is the
	// fast path for each outbox, this is the backstop for both.
	dispatchCtx, stopDispatch := context.WithCancel(context.Background())
	var dispatchWaitGroup sync.WaitGroup
	dispatchWaitGroup.Add(1)
	go func() {
		defer dispatchWaitGroup.Done()
		runMaintenanceSweeper(dispatchCtx, kdsNotificationUsecase, guestNotificationUsecase, paymentUsecase, env.KdsDispatchIntervalSeconds, rootLogger)
	}()

	server := &http.Server{Addr: fmt.Sprintf(":%s", env.Port), Handler: router}

	go func() {
		rootLogger.Info("server listening", slog.String("port", env.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			rootLogger.Error("server failed", slog.Any("error", err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	rootLogger.Info("server shutting down")

	stopDispatch()
	dispatchWaitGroup.Wait()

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(shutdownCtx); err != nil {
		rootLogger.Error("server shutdown failed", slog.Any("error", err))
	}
}

// runMaintenanceSweeper drives both outboxes and the payment expiry sweep from one ticker (D5,
// FR-4): three tickers at the same interval would be three goroutines doing the same job, and
// extra env variables to keep in sync for no reason anyone could articulate.
func runMaintenanceSweeper(ctx context.Context, kdsNotificationUsecase domain.KdsNotificationUsecase, guestNotificationUsecase domain.GuestNotificationUsecase, paymentUsecase domain.PaymentUsecase, intervalSeconds int, logger *slog.Logger) {
	ticker := time.NewTicker(time.Duration(intervalSeconds) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := kdsNotificationUsecase.DispatchPending(context.Background()); err != nil {
				logger.Error("kds dispatch sweep failed", slog.Any("error", err))
			}
			if err := guestNotificationUsecase.DispatchPending(context.Background()); err != nil {
				logger.Error("guest notification dispatch sweep failed", slog.Any("error", err))
			}
			if err := guestNotificationUsecase.ExpireStaleSending(context.Background()); err != nil {
				logger.Error("guest notification stale-sending sweep failed", slog.Any("error", err))
			}
			if err := paymentUsecase.ExpireStalePayments(context.Background()); err != nil {
				logger.Error("payment expiry sweep failed", slog.Any("error", err))
			}
		}
	}
}
