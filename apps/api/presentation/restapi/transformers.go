package restapi

import (
	"apps/api/domain/auth"
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"apps/api/domain/calculation"
	"apps/api/domain/category"
	"apps/api/domain/coupon"
	"apps/api/domain/expense"
	"apps/api/domain/material"
	"apps/api/domain/product"
	"apps/api/domain/reservation"
	"apps/api/domain/transaction"
	"apps/api/domain/variant"
	"apps/api/domain/wallet"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	w.WriteHeader(ToHttpStatus(err))
	json.NewEncoder(w).Encode(err)
}

func WriteResponse(w http.ResponseWriter, response any) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func ToHttpStatus(err apiContract.Error) int {
	switch err.Code {
	case apiContract.BAD_REQUEST:
		return http.StatusBadRequest
	case apiContract.NOT_FOUND:
		return http.StatusNotFound
	case apiContract.UNAUTHORIZED:
		return http.StatusUnauthorized
	case apiContract.INTERNAL_SERVER_ERROR:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

func ToErrorCode(errorType base.ErrorType) apiContract.ErrorCode {
	switch errorType {
	case base.BadRequest:
		return apiContract.BAD_REQUEST
	case base.NotFound:
		return apiContract.NOT_FOUND
	case base.Unauthorized:
		return apiContract.UNAUTHORIZED
	case base.InternalServerError:
		return apiContract.INTERNAL_SERVER_ERROR
	default:
		return apiContract.INTERNAL_SERVER_ERROR
	}
}

func GetDomain(r *http.Request) string {
	host := r.Host
	domain := strings.TrimPrefix(host, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.Split(domain, ":")[0]
	return domain
}

func GetOriginDomain(r *http.Request) string {
	host := r.Header.Get("Origin")
	domain := strings.TrimPrefix(host, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.Split(domain, ":")[0]
	return domain
}

func GetSortBy(r *http.Request) base.SortBy {
	sortByQuery := r.URL.Query().Get("sortBy")
	switch sortByQuery {
	case "created_at":
		return base.CreatedAt
	default:
		return base.CreatedAt
	}
}

func GetOrder(r *http.Request) base.Order {
	orderQuery := r.URL.Query().Get("order")
	switch orderQuery {
	case "asc":
		return base.Ascending
	case "desc":
		return base.Descending
	default:
		return base.Ascending
	}
}

func GetQuery(r *http.Request) string {
	return r.URL.Query().Get("query")
}

func GetGroupBy(r *http.Request) string {
	return r.URL.Query().Get("groupBy")
}

func GetLimit(r *http.Request) (int, error) {
	limitQuery := r.URL.Query().Get("limit")
	if limitQuery == "" {
		return 0, nil
	} else {
		return strconv.Atoi(limitQuery)
	}
}

func GetSkip(r *http.Request) (int, error) {
	skipQuery := r.URL.Query().Get("skip")
	if skipQuery == "" {
		return 0, nil
	} else {
		return strconv.Atoi(skipQuery)
	}
}

func GetBudgetId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["budgetId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetBudgetRequest(r *http.Request) (apiContract.BudgetRequest, error) {
	var budgetRequest apiContract.BudgetRequest
	err := json.NewDecoder(r.Body).Decode(&budgetRequest)
	return budgetRequest, err
}

func ToApiBudget(budget budget.Budget) apiContract.Budget {
	return apiContract.Budget{
		Id:         budget.Id,
		Name:       budget.Name,
		Percentage: budget.Percentage,
		Balance:    budget.Balance,
		DeletedAt:  budget.DeletedAt,
		CreatedAt:  budget.CreatedAt,
	}
}

func ToBudget(budgetRequest apiContract.BudgetRequest) budget.Budget {
	return budget.Budget{
		Name:       budgetRequest.Name,
		Percentage: budgetRequest.Percentage,
		Balance:    budgetRequest.Balance,
	}
}

func GetCategoryId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["categoryId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCategoryRequest(r *http.Request) (apiContract.CategoryRequest, error) {
	var categoryRequest apiContract.CategoryRequest
	err := json.NewDecoder(r.Body).Decode(&categoryRequest)
	return categoryRequest, err
}

func ToApiCategory(category category.Category) apiContract.Category {
	return apiContract.Category{
		Id:        category.Id,
		Name:      category.Name,
		DeletedAt: category.DeletedAt,
		CreatedAt: category.CreatedAt,
	}
}

func ToCategory(categoryRequest apiContract.CategoryRequest) category.Category {
	return category.Category{
		Name: categoryRequest.Name,
	}
}

func GetCouponId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["couponId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCouponRequest(r *http.Request) (apiContract.CouponRequest, error) {
	var couponRequest apiContract.CouponRequest
	err := json.NewDecoder(r.Body).Decode(&couponRequest)
	return couponRequest, err
}

func ToApiCoupon(coupon coupon.Coupon) apiContract.Coupon {
	return apiContract.Coupon{
		Id:        coupon.Id,
		Code:      coupon.Code,
		Type:      string(coupon.Type),
		Amount:    coupon.Amount,
		CreatedAt: coupon.CreatedAt,
		DeletedAt: coupon.DeletedAt,
	}
}

func ToCoupon(couponRequest apiContract.CouponRequest) coupon.Coupon {
	return coupon.Coupon{
		Code:   couponRequest.Code,
		Type:   coupon.CouponType(couponRequest.Type),
		Amount: couponRequest.Amount,
	}
}

func GetExpenseId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetExpenseRequest(r *http.Request) (apiContract.ExpenseRequest, error) {
	var expenseRequest apiContract.ExpenseRequest
	err := json.NewDecoder(r.Body).Decode(&expenseRequest)
	return expenseRequest, err
}

func ToApiExpense(expense expense.Expense) apiContract.Expense {
	apiExpenseItems := []apiContract.ExpenseItem{}
	for _, expenseItem := range expense.ExpenseItems {
		apiExpenseItems = append(apiExpenseItems, apiContract.ExpenseItem{
			Id:        expenseItem.Id,
			Name:      expenseItem.Name,
			Unit:      expenseItem.Unit,
			Price:     expenseItem.Price,
			Amount:    expenseItem.Amount,
			Subtotal:  expenseItem.Subtotal,
			ExpenseId: expenseItem.ExpenseId,
		})
	}

	return apiContract.Expense{
		Id:           expense.Id,
		DeletedAt:    expense.DeletedAt,
		CreatedAt:    expense.CreatedAt,
		WalletId:     expense.WalletId,
		Wallet:       apiContract.Wallet(expense.Wallet),
		BudgetId:     expense.BudgetId,
		Budget:       apiContract.Budget(expense.Budget),
		Total:        expense.Total,
		ExpenseItems: apiExpenseItems,
	}
}

func ToExpense(expenseRequest apiContract.ExpenseRequest) expense.Expense {
	var total float32
	expenseItems := []expense.ExpenseItem{}
	for _, expenseItem := range expenseRequest.ExpenseItems {
		var id int64
		if expenseItem.Id != nil {
			id = *expenseItem.Id
		}
		subtotal := expenseItem.Price * expenseItem.Amount
		total += subtotal
		expenseItems = append(expenseItems, expense.ExpenseItem{
			Id:       id,
			Name:     expenseItem.Name,
			Unit:     expenseItem.Unit,
			Price:    expenseItem.Price,
			Amount:   expenseItem.Amount,
			Subtotal: subtotal,
		})
	}

	return expense.Expense{
		WalletId:     expenseRequest.WalletId,
		BudgetId:     expenseRequest.BudgetId,
		ExpenseItems: expenseItems,
		Total:        total,
	}
}

func GetMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["materialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetMaterialRequest(r *http.Request) (apiContract.MaterialRequest, error) {
	var materialRequest apiContract.MaterialRequest
	err := json.NewDecoder(r.Body).Decode(&materialRequest)
	return materialRequest, err
}

func ToApiMaterial(material material.Material) apiContract.Material {
	return apiContract.Material{
		Id:          material.Id,
		Name:        material.Name,
		Price:       material.Price,
		Unit:        material.Unit,
		DeletedAt:   material.DeletedAt,
		CreatedAt:   material.CreatedAt,
		Description: material.Description,
	}
}

func ToMaterial(materialRequest apiContract.MaterialRequest) material.Material {
	return material.Material{
		Name:        materialRequest.Name,
		Price:       materialRequest.Price,
		Unit:        materialRequest.Unit,
		Description: materialRequest.Description,
	}
}

func GetProductId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductIdQuery(r *http.Request) (*int, error) {
	productIdQuery := r.URL.Query().Get("productId")
	if productIdQuery == "" {
		return nil, nil
	} else {
		id, err := strconv.Atoi(productIdQuery)
		return &id, err
	}
}

func GetOptionValueIds(r *http.Request) ([]int, error) {
	query := r.URL.Query()
	values := query["optionValueIds[]"]

	ids := []int{}
	for _, v := range values {
		if id, err := strconv.Atoi(v); err == nil {
			ids = append(ids, id)
		} else {
			return []int{}, err
		}
	}

	return ids, nil
}

func GetProductRequest(r *http.Request) (apiContract.ProductRequest, error) {
	var productRequest apiContract.ProductRequest
	err := json.NewDecoder(r.Body).Decode(&productRequest)
	return productRequest, err
}

func ToApiProduct(product product.Product) apiContract.Product {
	apiOptions := []apiContract.Option{}
	for _, option := range product.Options {
		apiValues := []apiContract.OptionValue{}

		for _, value := range option.Values {
			apiValues = append(apiValues, apiContract.OptionValue{
				Id:   value.Id,
				Name: value.Name,
			})
		}

		apiOptions = append(apiOptions, apiContract.Option{
			Id:     option.Id,
			Name:   option.Name,
			Values: apiValues,
		})
	}

	return apiContract.Product{
		Id:          product.Id,
		Name:        product.Name,
		CategoryId:  product.CategoryId,
		Category:    apiContract.Category(product.Category),
		DeletedAt:   product.DeletedAt,
		CreatedAt:   product.CreatedAt,
		Description: product.Description,
		ImageUrl:    product.ImageUrl,
		Options:     apiOptions,
	}
}

func ToProduct(productRequest apiContract.ProductRequest) product.Product {
	options := []product.Option{}

	for _, apiOption := range productRequest.Options {
		var id int64
		if apiOption.Id != nil {
			id = *apiOption.Id
		}

		values := []product.OptionValue{}

		for _, apiOptionValue := range apiOption.Values {
			var id int64
			if apiOptionValue.Id != nil {
				id = *apiOptionValue.Id
			}

			values = append(values, product.OptionValue{
				Id:   id,
				Name: apiOptionValue.Name,
			})
		}

		options = append(options, product.Option{
			Id:     id,
			Name:   apiOption.Name,
			Values: values,
		})
	}

	return product.Product{
		Name:        productRequest.Name,
		CategoryId:  productRequest.CategoryId,
		ImageUrl:    productRequest.ImageUrl,
		Description: productRequest.Description,
		Options:     options,
	}
}

func GetVariantId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["variantId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetVariantRequest(r *http.Request) (apiContract.VariantRequest, error) {
	var variantRequest apiContract.VariantRequest
	err := json.NewDecoder(r.Body).Decode(&variantRequest)
	return variantRequest, err
}

func GetVariantMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["variantMaterialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetVariantMaterialRequest(r *http.Request) (apiContract.VariantMaterialRequest, error) {
	var variantMaterialRequest apiContract.VariantMaterialRequest
	err := json.NewDecoder(r.Body).Decode(&variantMaterialRequest)
	return variantMaterialRequest, err
}

func ToApiVariantMaterial(variantMaterial variant.VariantMaterial) apiContract.VariantMaterial {
	return apiContract.VariantMaterial{
		Id:         variantMaterial.Id,
		VariantId:  variantMaterial.VariantId,
		MaterialId: variantMaterial.MaterialId,
		Amount:     variantMaterial.Amount,
		DeletedAt:  variantMaterial.DeletedAt,
		CreatedAt:  variantMaterial.CreatedAt,
		Material: apiContract.Material{
			Id:          variantMaterial.Material.Id,
			Name:        variantMaterial.Material.Name,
			Description: variantMaterial.Material.Description,
			Price:       variantMaterial.Material.Price,
			Unit:        variantMaterial.Material.Unit,
			CreatedAt:   variantMaterial.CreatedAt,
			DeletedAt:   variantMaterial.DeletedAt,
		},
	}
}

func ToApiVariant(variant variant.Variant) apiContract.Variant {
	apiMaterials := []apiContract.VariantMaterial{}
	for _, variantMaterial := range variant.Materials {
		apiMaterials = append(apiMaterials, ToApiVariantMaterial(variantMaterial))
	}

	apiVariantValues := []apiContract.VariantValue{}
	for _, variantValue := range variant.VariantValues {
		apiVariantValues = append(apiVariantValues, apiContract.VariantValue{
			Id:            variantValue.Id,
			VariantId:     variantValue.VariantId,
			OptionValueId: variantValue.OptionValueId,
			OptionValue: apiContract.OptionValue{
				Id:   variantValue.OptionValue.Id,
				Name: variantValue.OptionValue.Name,
			},
		})
	}

	return apiContract.Variant{
		Id:          variant.Id,
		Name:        variant.Name,
		Price:       variant.Price,
		ProductId:   variant.ProductId,
		Product:     ToApiProduct(variant.Product),
		Materials:   apiMaterials,
		DeletedAt:   variant.DeletedAt,
		CreatedAt:   variant.CreatedAt,
		Description: variant.Description,
		Values:      apiVariantValues,
	}
}

func ToVariant(variantRequest apiContract.VariantRequest) variant.Variant {
	variantMaterials := []variant.VariantMaterial{}
	for _, variantMaterial := range variantRequest.Materials {
		var id int64
		if variantMaterial.Id != nil {
			id = *variantMaterial.Id
		}
		variantMaterials = append(variantMaterials, variant.VariantMaterial{
			Id:         id,
			MaterialId: variantMaterial.MaterialId,
			Amount:     variantMaterial.Amount,
		})
	}

	variantValues := []variant.VariantValue{}
	for _, variantValue := range variantRequest.Values {
		var id int64
		if variantValue.Id != nil {
			id = *variantValue.Id
		}
		variantValues = append(variantValues, variant.VariantValue{
			Id:            id,
			OptionValueId: variantValue.OptionValueId,
		})
	}

	return variant.Variant{
		Name:          variantRequest.Name,
		Price:         variantRequest.Price,
		ProductId:     variantRequest.ProductId,
		Materials:     variantMaterials,
		Description:   variantRequest.Description,
		VariantValues: variantValues,
	}
}

func GetTransactionId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTransactionRequest(r *http.Request) (apiContract.TransactionRequest, error) {
	var transactionRequest apiContract.TransactionRequest
	err := json.NewDecoder(r.Body).Decode(&transactionRequest)
	return transactionRequest, err
}

func GetTransactionPayRequest(r *http.Request) (apiContract.TransactionPayRequest, error) {
	var transactionPayRequest apiContract.TransactionPayRequest
	err := json.NewDecoder(r.Body).Decode(&transactionPayRequest)
	return transactionPayRequest, err
}

func GetPaymentStatus(r *http.Request) transaction.PaymentStatus {
	paymentStatusQuery := r.URL.Query().Get("paymentStatus")
	switch paymentStatusQuery {
	case "paid":
		return transaction.Paid
	case "unpaid":
		return transaction.Unpaid
	case "all":
		return transaction.All
	default:
		return transaction.All
	}
}

func GetWalletIdQuery(r *http.Request) *int {
	walletId := r.URL.Query().Get("walletId")

	id, err := strconv.Atoi(walletId)
	if err != nil {
		return nil
	}

	return &id
}

func ToApiTransaction(transaction transaction.Transaction) apiContract.Transaction {
	apiTransactionItems := []apiContract.TransactionItem{}
	for _, item := range transaction.TransactionItems {
		apiTransactionItems = append(apiTransactionItems, apiContract.TransactionItem{
			Id:             item.Id,
			TransactionId:  item.TransactionId,
			VariantId:      item.VariantId,
			Variant:        ToApiVariant(item.Variant),
			Amount:         item.Amount,
			Price:          item.Price,
			DiscountAmount: item.DiscountAmount,
			Subtotal:       item.Subtotal,
		})
	}

	apiTransactionCoupons := []apiContract.TransactionCoupon{}
	for _, transactionCoupon := range transaction.TransactionCoupons {
		apiTransactionCoupons = append(apiTransactionCoupons, apiContract.TransactionCoupon{
			Id:            transactionCoupon.Id,
			CouponId:      transactionCoupon.CouponId,
			Coupon:        ToApiCoupon(transactionCoupon.Coupon),
			Type:          string(transactionCoupon.Type),
			Amount:        transactionCoupon.Amount,
			TransactionId: transactionCoupon.TransactionId,
		})
	}

	return apiContract.Transaction{
		Id:                 transaction.Id,
		Name:               transaction.Name,
		OrderNumber:        transaction.OrderNumber,
		DeletedAt:          transaction.DeletedAt,
		CreatedAt:          transaction.CreatedAt,
		WalletId:           transaction.WalletId,
		Wallet:             (*apiContract.Wallet)(transaction.Wallet),
		Total:              transaction.Total,
		TotalIncome:        transaction.TotalIncome,
		PaidAt:             transaction.PaidAt,
		PaidAmount:         transaction.PaidAmount,
		TransactionItems:   apiTransactionItems,
		TransactionCoupons: apiTransactionCoupons,
	}
}

func ToTransaction(transactionRequest apiContract.TransactionRequest) transaction.Transaction {
	transactionItems := []transaction.TransactionItem{}
	for _, item := range transactionRequest.TransactionItems {
		var id int64
		if item.Id != nil {
			id = *item.Id
		}
		transactionItems = append(transactionItems, transaction.TransactionItem{
			Id:             id,
			VariantId:      item.VariantId,
			Amount:         item.Amount,
			DiscountAmount: item.DiscountAmount,
		})
	}

	transactionCoupons := []transaction.TransactionCoupon{}
	for _, transactionCoupon := range transactionRequest.TransactionCoupons {
		var id int64
		if transactionCoupon.Id != nil {
			id = *transactionCoupon.Id
		}
		transactionCoupons = append(transactionCoupons, transaction.TransactionCoupon{
			Id:       id,
			CouponId: transactionCoupon.CouponId,
		})
	}

	return transaction.Transaction{
		Name:               transactionRequest.Name,
		OrderNumber:        transactionRequest.OrderNumber,
		TransactionItems:   transactionItems,
		TransactionCoupons: transactionCoupons,
	}
}

func ToApiTransactionStatistic(transactionStatistic transaction.TransactionStatistic) apiContract.TransactionStatistic {
	return apiContract.TransactionStatistic{
		Date:        transactionStatistic.Date,
		Total:       transactionStatistic.Total,
		TotalIncome: transactionStatistic.TotalIncome,
	}
}

func GetReservationId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["reservationId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCheckoutStatus(r *http.Request) reservation.CheckoutStatus {
	checkoutStatusQuery := r.URL.Query().Get("checkoutStatus")
	switch checkoutStatusQuery {
	case "completed":
		return reservation.Completed
	case "ongoing":
		return reservation.Ongoing
	case "all":
		return reservation.All
	default:
		return reservation.All
	}
}

func GetReservationRequests(r *http.Request) ([]apiContract.ReservationRequest, error) {
	var reservationRequests []apiContract.ReservationRequest
	err := json.NewDecoder(r.Body).Decode(&reservationRequests)
	return reservationRequests, err
}

func GetReservationIds(r *http.Request) ([]int64, error) {
	var reservationRequests []int64
	err := json.NewDecoder(r.Body).Decode(&reservationRequests)
	return reservationRequests, err
}

func ToApiReservation(reservation reservation.Reservation) apiContract.Reservation {
	return apiContract.Reservation{
		Id:         reservation.Id,
		Code:       reservation.Code,
		Name:       reservation.Name,
		VariantId:  reservation.VariantId,
		Variant:    ToApiVariant(reservation.Variant),
		CheckinAt:  reservation.CheckinAt,
		CheckoutAt: reservation.CheckoutAt,
		CreatedAt:  reservation.CreatedAt,
	}
}

func ToReservation(reservationRequest apiContract.ReservationRequest) reservation.Reservation {
	return reservation.Reservation{
		Code:      reservationRequest.Code,
		Name:      reservationRequest.Name,
		VariantId: reservationRequest.VariantId,
	}
}

func GetWalletId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["walletId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetWalletRequest(r *http.Request) (apiContract.WalletRequest, error) {
	var walletRequest apiContract.WalletRequest
	err := json.NewDecoder(r.Body).Decode(&walletRequest)
	return walletRequest, err
}

func GetWalletTransferRequest(r *http.Request) (apiContract.WalletTransferRequest, error) {
	var walletTransferRequest apiContract.WalletTransferRequest
	err := json.NewDecoder(r.Body).Decode(&walletTransferRequest)
	return walletTransferRequest, err
}

func ToApiWallet(wallet wallet.Wallet) apiContract.Wallet {
	return apiContract.Wallet{
		Id:                    wallet.Id,
		Name:                  wallet.Name,
		Balance:               wallet.Balance,
		PaymentCostPercentage: wallet.PaymentCostPercentage,
		IsCashless:            wallet.IsCashless,
		DeletedAt:             wallet.DeletedAt,
		CreatedAt:             wallet.CreatedAt,
	}
}

func ToWalletRequest(walletRequest apiContract.WalletRequest) wallet.Wallet {
	return wallet.Wallet{
		Name:                  walletRequest.Name,
		Balance:               walletRequest.Balance,
		PaymentCostPercentage: walletRequest.PaymentCostPercentage,
		IsCashless:            walletRequest.IsCashless,
	}
}

func ToApiWalletTransfer(walletTransfer wallet.WalletTransfer) apiContract.WalletTransfer {
	return apiContract.WalletTransfer{
		Id:           walletTransfer.Id,
		CreatedAt:    walletTransfer.CreatedAt,
		Amount:       walletTransfer.Amount,
		FromWalletId: walletTransfer.FromWalletId,
		FromWallet:   apiContract.Wallet(walletTransfer.FromWallet),
		ToWalletId:   walletTransfer.ToWalletId,
		ToWallet:     apiContract.Wallet(walletTransfer.ToWallet),
		DeletedAt:    walletTransfer.DeletedAt,
	}
}

func ToWalletTransferRequest(walletTransferRequest apiContract.WalletTransferRequest) wallet.WalletTransfer {
	return wallet.WalletTransfer{
		Amount:     walletTransferRequest.Amount,
		ToWalletId: walletTransferRequest.ToWalletId,
	}
}

func GetLoginRequest(r *http.Request) (apiContract.AuthLoginRequest, error) {
	var loginRequest apiContract.AuthLoginRequest
	err := json.NewDecoder(r.Body).Decode(&loginRequest)
	return loginRequest, err
}

func ToLoginRequest(loginRequest apiContract.AuthLoginRequest) auth.LoginRequest {
	return auth.LoginRequest{
		Username: loginRequest.Username,
		Password: loginRequest.Password,
	}
}

func GetCalculationId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["calculationId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCalculationRequest(r *http.Request) (apiContract.CalculationRequest, error) {
	var calculationRequest apiContract.CalculationRequest
	err := json.NewDecoder(r.Body).Decode(&calculationRequest)
	return calculationRequest, err
}

func ToCalculation(calculationRequest apiContract.CalculationRequest) calculation.Calculation {
	calculationItems := []calculation.CalculationItem{}
	for _, item := range calculationRequest.CalculationItems {
		var id int64
		if item.Id != nil {
			id = *item.Id
		}

		calculationItems = append(calculationItems, calculation.CalculationItem{
			Id:     id,
			Price:  item.Price,
			Amount: item.Amount,
		})
	}

	return calculation.Calculation{
		WalletId:         calculationRequest.WalletId,
		CalculationItems: calculationItems,
	}
}

func ToApiCalculation(calculation calculation.Calculation) apiContract.Calculation {
	calculationItems := []apiContract.CalculationItem{}
	for _, item := range calculation.CalculationItems {
		calculationItems = append(calculationItems, apiContract.CalculationItem{
			Id:            item.Id,
			CalculationId: item.CalculationId,
			Price:         item.Price,
			Amount:        item.Amount,
			Subtotal:      item.Subtotal,
		})
	}

	return apiContract.Calculation{
		Id:               calculation.Id,
		CreatedAt:        calculation.CreatedAt,
		UpdatedAt:        calculation.UpdatedAt,
		DeletedAt:        calculation.DeletedAt,
		WalletId:         calculation.WalletId,
		Wallet:           ToApiWallet(calculation.Wallet),
		TotalWallet:      calculation.TotalWallet,
		TotalCalculation: calculation.TotalCalculation,
		CalculationItems: calculationItems,
	}
}
