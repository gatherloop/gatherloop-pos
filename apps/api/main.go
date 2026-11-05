package main

import (
	"apps/api/data/doku"
	"apps/api/data/expopush"
	"apps/api/data/fonnte"
	"apps/api/data/mysql"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"apps/api/presentation/scheduler"
	"apps/api/utils"
	"apps/api/utils/logger"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
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

	paymentGatewayPort := doku.NewPaymentGatewayPort(dokuConfig)

	expoPushConfig := expopush.Config{AccessToken: env.ExpoPushAccessToken}
	if err := expoPushConfig.Validate(); err != nil {
		rootLogger.Warn("expo push gateway not configured; KDS notifications will fail", slog.Any("error", err))
	}

	kdsNotificationGatewayPort := expopush.NewKdsNotificationGatewayPort(expoPushConfig)

	fonnteConfig := fonnte.Config{Token: env.FonnteToken, BaseURL: env.FonnteBaseURL}
	var whatsappGatewayPort domain.WhatsAppGatewayPort
	if err := fonnteConfig.Validate(); err != nil {
		rootLogger.Warn("whatsapp gateway not configured; guest notifications will be skipped", slog.Any("error", err))
		whatsappGatewayPort = fonnte.NewDisabledWhatsAppGateway()
	} else if env.OrderWebBaseURL == "" {
		rootLogger.Warn("ORDER_WEB_BASE_URL not configured; guest notifications will be skipped")
		whatsappGatewayPort = fonnte.NewDisabledWhatsAppGateway()
	} else {
		whatsappGatewayPort = fonnte.NewWhatsAppGatewayPort(fonnteConfig)
	}

	router := mux.NewRouter().StrictSlash(true)
	router.Use(restapi.EnableCORS)
	router.Use(logger.RequestLogger(rootLogger))

	orderPaymentWalletId, _ := strconv.ParseInt(env.OrderPaymentWalletId, 10, 64)

	walletRepoPort := mysql.NewWalletRepoPort(db)
	variantRepoPort := mysql.NewVariantRepoPort(db)
	productRepoPort := mysql.NewProductRepoPort(db)
	budgetRepoPort := mysql.NewBudgetRepoPort(db)
	transactionRepoPort := mysql.NewTransactionRepoPort(db)
	materialRepoPort := mysql.NewMaterialRepoPort(db)
	supplierRepoPort := mysql.NewSupplierRepoPort(db)
	expenseRepoPort := mysql.NewExpenseRepoPort(db)
	categoryRepoPort := mysql.NewCategoryRepoPort(db)
	tagRepoPort := mysql.NewTagRepoPort(db)
	couponRepoPort := mysql.NewCouponRepoPort(db)
	ticketRepoPort := mysql.NewTicketRepoPort(db)
	tableRepoPort := mysql.NewTableRepoPort(db)
	cartRepoPort := mysql.NewCartRepoPort(db)
	customerRepoPort := mysql.NewCustomerRepoPort(db)
	paymentRepoPort := mysql.NewPaymentRepoPort(db)
	authRepoPort := mysql.NewAuthRepoPort(db)
	calculationRepoPort := mysql.NewCalculationRepoPort(db)
	rentalRepoPort := mysql.NewRentalRepoPort(db)
	checklistTemplateRepoPort := mysql.NewChecklistTemplateRepoPort(db)
	checklistSessionRepoPort := mysql.NewChecklistSessionRepoPort(db)
	stockCheckRepoPort := mysql.NewStockCheckRepoPort(db)
	availabilityRepoPort := mysql.NewAvailabilityRepoPort(db)
	kdsDeviceRepoPort := mysql.NewKdsDeviceRepoPort(db)
	kdsNotificationRepoPort := mysql.NewKdsNotificationRepoPort(db)
	guestNotificationRepoPort := mysql.NewGuestNotificationRepoPort(db)
	paymentVerificationRepoPort := mysql.NewPaymentVerificationRepoPort(db)
	whatsAppNumberVerificationRepoPort := mysql.NewWhatsAppNumberVerificationRepoPort(db)

	whatsappNumberVerificationService := domain.NewWhatsappNumberVerificationUsecase(whatsAppNumberVerificationRepoPort, whatsappGatewayPort)
	kdsNotificationService := domain.NewKdsNotificationService(kdsNotificationRepoPort, kdsDeviceRepoPort, transactionRepoPort, kdsNotificationGatewayPort, env.KdsPushSound)
	guestNotificationService := domain.NewGuestNotificationService(guestNotificationRepoPort, transactionRepoPort, paymentRepoPort, whatsappGatewayPort, env.OrderWebBaseURL)
	availabilityService := domain.NewAvailabilityService(productRepoPort, variantRepoPort, availabilityRepoPort)
	paymentService := domain.NewPaymentService(
		transactionRepoPort,
		paymentRepoPort,
		paymentVerificationRepoPort,
		paymentGatewayPort,
		cartRepoPort,
		walletRepoPort,
		kdsNotificationRepoPort,
		availabilityService,
		kdsNotificationService,
		orderPaymentWalletId,
	)
	paymentVerificationService := domain.NewPaymentVerificationService(paymentRepoPort)
	cartService := domain.NewCartService(
		cartRepoPort,
		paymentRepoPort,
		variantRepoPort,
	)
	tagService := domain.NewTagService(tagRepoPort)
	variantService := domain.NewVariantService(tagRepoPort, tagService)
	transactionService := domain.NewTransactionService(
		couponRepoPort,
		paymentRepoPort,
		cartRepoPort,
		paymentService,
	)
	tableService := domain.NewTableService(tableRepoPort)
	materialService := domain.NewMaterialService(supplierRepoPort)

	kdsNotificationUsecase := domain.NewKdsNotificationUsecase(kdsNotificationService)
	guestNotificationUsecase := domain.NewGuestNotificationUsecase(guestNotificationRepoPort, guestNotificationService)
	walletUsecase := domain.NewWalletUsecase(walletRepoPort)
	transactionUsecase := domain.NewTransactionUsecase(
		transactionRepoPort,
		variantRepoPort,
		walletRepoPort,
		paymentRepoPort,
		guestNotificationRepoPort,
		transactionService,
		paymentService,
		availabilityService,
		kdsNotificationService,
		guestNotificationService,
	)
	variantUsecase := domain.NewVariantUsecase(variantRepoPort, productRepoPort, variantService)
	productUsecase := domain.NewProductUsecase(productRepoPort, variantRepoPort)
	materialUsecase := domain.NewMaterialUsecase(materialRepoPort, materialService)
	supplierUsecase := domain.NewSupplierUsecase(supplierRepoPort)
	expenseUsecase := domain.NewExpenseUsecase(expenseRepoPort, budgetRepoPort, walletRepoPort)
	categoryUsecase := domain.NewCategoryUsecase(categoryRepoPort)
	tagUsecase := domain.NewTagUsecase(tagRepoPort, tagService)
	couponUsecase := domain.NewCouponUsecase(couponRepoPort)
	ticketUsecase := domain.NewTicketUsecase(ticketRepoPort)
	tableUsecase := domain.NewTableUsecase(tableRepoPort, tableService)
	cartUsecase := domain.NewCartUsecase(cartRepoPort, tableRepoPort, cartService)
	customerUsecase := domain.NewCustomerUsecase(customerRepoPort)
	paymentUsecase := domain.NewPaymentUsecase(
		paymentRepoPort,
		paymentGatewayPort,
		customerRepoPort,
		cartRepoPort,
		transactionRepoPort,
		variantRepoPort,
		walletRepoPort,
		kdsNotificationRepoPort,
		paymentVerificationRepoPort,
		paymentService,
		availabilityService,
		whatsappNumberVerificationService,
		kdsNotificationService,
		env.DokuQrisExpirySeconds,
		env.CashPaymentExpirySeconds,
		env.CodVerificationExpirySeconds,
		orderPaymentWalletId,
	)
	paymentVerificationUsecase := domain.NewPaymentVerificationUsecase(
		paymentRepoPort,
		paymentVerificationRepoPort,
		transactionRepoPort,
		cartRepoPort,
		kdsNotificationRepoPort,
		paymentVerificationService,
		paymentService,
		kdsNotificationService,
	)
	budgetUsecase := domain.NewBudgetUsecase(budgetRepoPort)
	authUsecase := domain.NewAuthUsecase(authRepoPort)
	calculationUsecase := domain.NewCalculationUsecase(calculationRepoPort, walletRepoPort)
	rentalUsecase := domain.NewRentalUsecase(rentalRepoPort, variantRepoPort, transactionRepoPort, ticketRepoPort)
	checklistTemplateUsecase := domain.NewChecklistTemplateUsecase(checklistTemplateRepoPort)
	checklistSessionUsecase := domain.NewChecklistSessionUsecase(checklistSessionRepoPort, checklistTemplateRepoPort)
	stockCheckUsecase := domain.NewStockCheckUsecase(stockCheckRepoPort, materialRepoPort)
	availabilityUsecase := domain.NewAvailabilityUsecase(
		availabilityRepoPort,
		productRepoPort,
		variantRepoPort,
		availabilityService,
	)
	kdsDeviceUsecase := domain.NewKdsDeviceUsecase(kdsDeviceRepoPort, kdsNotificationGatewayPort, env.KdsPushSound)

	walletHandler := restapi.NewWalletHandler(walletUsecase)
	transactionHandler := restapi.NewTransactionHandler(transactionUsecase)
	variantHandler := restapi.NewVariantHandler(variantUsecase)
	productHandler := restapi.NewProductHandler(productUsecase)
	materialHandler := restapi.NewMaterialHandler(materialUsecase)
	supplierHandler := restapi.NewSupplierHandler(supplierUsecase)
	expenseHandler := restapi.NewExpenseHandler(expenseUsecase)
	categoryHandler := restapi.NewCategoryHandler(categoryUsecase)
	tagHandler := restapi.NewTagHandler(tagUsecase)
	couponHandler := restapi.NewCouponHandler(couponUsecase)
	ticketHandler := restapi.NewTicketHandler(ticketUsecase)
	tableHandler := restapi.NewTableHandler(tableUsecase)
	cartHandler := restapi.NewCartHandler(cartUsecase)
	customerHandler := restapi.NewCustomerHandler(customerUsecase)
	paymentHandler := restapi.NewPaymentHandler(paymentUsecase)
	paymentVerificationHandler := restapi.NewPaymentVerificationHandler(paymentVerificationUsecase)
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
	restapi.NewTagRouter(tagHandler).AddRouter(router)
	restapi.NewCouponRouter(couponHandler).AddRouter(router)
	restapi.NewTicketRouter(ticketHandler).AddRouter(router)
	restapi.NewTableRouter(tableHandler).AddRouter(router)
	restapi.NewCartRouter(cartHandler).AddRouter(router)
	restapi.NewCustomerRouter(customerHandler).AddRouter(router)
	restapi.NewPaymentRouter(paymentHandler).AddRouter(router)
	restapi.NewPaymentVerificationRouter(paymentVerificationHandler).AddRouter(router)
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

	maintenanceScheduler := scheduler.New(env.KdsDispatchIntervalSeconds, rootLogger)
	scheduler.AddKdsNotificationJobs(maintenanceScheduler, kdsNotificationUsecase)
	scheduler.AddGuestNotificationJobs(maintenanceScheduler, guestNotificationUsecase)
	scheduler.AddPaymentJobs(maintenanceScheduler, paymentUsecase)
	maintenanceScheduler.Start()

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

	maintenanceScheduler.Stop()

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(shutdownCtx); err != nil {
		rootLogger.Error("server shutdown failed", slog.Any("error", err))
	}
}
