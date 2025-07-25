package restapi

import (
	"apps/api/domain/auth"
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"apps/api/domain/calculation"
	"apps/api/domain/category"
	"apps/api/domain/expense"
	"apps/api/domain/material"
	"apps/api/domain/product"
	"apps/api/domain/transaction"
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

func GetProductRequest(r *http.Request) (apiContract.ProductRequest, error) {
	var productRequest apiContract.ProductRequest
	err := json.NewDecoder(r.Body).Decode(&productRequest)
	return productRequest, err
}

func GetProductMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productMaterialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductMaterialRequest(r *http.Request) (apiContract.ProductMaterialRequest, error) {
	var productMaterialRequest apiContract.ProductMaterialRequest
	err := json.NewDecoder(r.Body).Decode(&productMaterialRequest)
	return productMaterialRequest, err
}

func ToApiProductMaterial(productMaterial product.ProductMaterial) apiContract.ProductMaterial {
	return apiContract.ProductMaterial{
		Id:         productMaterial.Id,
		ProductId:  productMaterial.ProductId,
		MaterialId: productMaterial.MaterialId,
		Amount:     productMaterial.Amount,
		DeletedAt:  productMaterial.DeletedAt,
		CreatedAt:  productMaterial.CreatedAt,
		Material: apiContract.Material{
			Id:          productMaterial.Material.Id,
			Name:        productMaterial.Material.Name,
			Description: productMaterial.Material.Description,
			Price:       productMaterial.Material.Price,
			Unit:        productMaterial.Material.Unit,
			CreatedAt:   productMaterial.CreatedAt,
			DeletedAt:   productMaterial.DeletedAt,
		},
	}
}

func ToApiProduct(product product.Product) apiContract.Product {
	apiMaterials := []apiContract.ProductMaterial{}

	for _, productMaterial := range product.Materials {
		apiMaterials = append(apiMaterials, ToApiProductMaterial(productMaterial))
	}

	return apiContract.Product{
		Id:          product.Id,
		Name:        product.Name,
		Price:       product.Price,
		CategoryId:  product.CategoryId,
		Category:    apiContract.Category(product.Category),
		Materials:   apiMaterials,
		DeletedAt:   product.DeletedAt,
		CreatedAt:   product.CreatedAt,
		Description: product.Description,
	}
}

func ToProduct(productRequest apiContract.ProductRequest) product.Product {
	productMaterials := []product.ProductMaterial{}
	for _, productMaterial := range productRequest.Materials {
		var id int64
		if productMaterial.Id != nil {
			id = *productMaterial.Id
		}
		productMaterials = append(productMaterials, product.ProductMaterial{
			Id:         id,
			MaterialId: productMaterial.MaterialId,
			Amount:     productMaterial.Amount,
		})
	}

	return product.Product{
		Name:        productRequest.Name,
		Price:       productRequest.Price,
		CategoryId:  productRequest.CategoryId,
		Materials:   productMaterials,
		Description: productRequest.Description,
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

func ToApiTransaction(transaction transaction.Transaction) apiContract.Transaction {
	apiTransactionItems := []apiContract.TransactionItem{}
	for _, item := range transaction.TransactionItems {
		apiTransactionItems = append(apiTransactionItems, apiContract.TransactionItem{
			Id:             item.Id,
			TransactionId:  item.TransactionId,
			ProductId:      item.ProductId,
			Product:        ToApiProduct(item.Product),
			Amount:         item.Amount,
			Price:          item.Price,
			DiscountAmount: item.DiscountAmount,
			Subtotal:       item.Subtotal,
		})
	}

	return apiContract.Transaction{
		Id:               transaction.Id,
		Name:             transaction.Name,
		DeletedAt:        transaction.DeletedAt,
		CreatedAt:        transaction.CreatedAt,
		WalletId:         transaction.WalletId,
		Wallet:           (*apiContract.Wallet)(transaction.Wallet),
		Total:            transaction.Total,
		TotalIncome:      transaction.TotalIncome,
		PaidAt:           transaction.PaidAt,
		PaidAmount:       transaction.PaidAmount,
		TransactionItems: apiTransactionItems,
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
			ProductId:      item.ProductId,
			Amount:         item.Amount,
			DiscountAmount: item.DiscountAmount,
		})
	}

	return transaction.Transaction{
		Name:             transactionRequest.Name,
		TransactionItems: transactionItems,
	}
}

func ToApiTransactionStatistic(transactionStatistic transaction.TransactionStatistic) apiContract.TransactionStatistic {
	return apiContract.TransactionStatistic{
		Date:        transactionStatistic.Date,
		Total:       transactionStatistic.Total,
		TotalIncome: transactionStatistic.TotalIncome,
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
