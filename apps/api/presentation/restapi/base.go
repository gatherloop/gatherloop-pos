package restapi

import (
	"apps/api/domain/base"
	"apps/api/domain/budget"
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

	"github.com/gorilla/mux"
)

func WriteError(w http.ResponseWriter, err apiContract.Error) {
	var httpStatus int
	switch err.Code {
	case apiContract.SERVER_ERROR:
		httpStatus = http.StatusInternalServerError
	case apiContract.DATA_NOT_FOUND:
		httpStatus = http.StatusBadRequest
	case apiContract.VALIDATION_ERROR:
		httpStatus = http.StatusBadRequest
	default:
		httpStatus = http.StatusInternalServerError
	}

	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(err)
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

func ToBudgetRequest(budgetRequest apiContract.BudgetRequest) budget.BudgetRequest {
	return budget.BudgetRequest{
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

func ToCategoryRequest(categoryRequest apiContract.CategoryRequest) category.CategoryRequest {
	return category.CategoryRequest{
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

func ToExpenseRequest(expenseRequest apiContract.ExpenseRequest) expense.ExpenseRequest {
	expenseItemRequests := []expense.ExpenseItemRequest{}
	for _, expenseItem := range expenseRequest.ExpenseItems {
		expenseItemRequests = append(expenseItemRequests, expense.ExpenseItemRequest{
			Name:   expenseItem.Name,
			Unit:   expenseItem.Unit,
			Price:  expenseItem.Price,
			Amount: expenseItem.Amount,
		})
	}

	return expense.ExpenseRequest{
		WalletId:     expenseRequest.WalletId,
		BudgetId:     expenseRequest.BudgetId,
		ExpenseItems: expenseItemRequests,
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

func ToMaterialRequest(materialRequest apiContract.MaterialRequest) material.MaterialRequest {
	return material.MaterialRequest{
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

func ToProductRequest(productRequest apiContract.ProductRequest) product.ProductRequest {
	productMaterials := []product.ProductMaterialRequest{}
	for _, productMaterial := range productRequest.Materials {
		productMaterials = append(productMaterials, product.ProductMaterialRequest{
			MaterialId: productMaterial.MaterialId,
			Amount:     productMaterial.Amount,
		})
	}

	return product.ProductRequest{
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
		TransactionItems: apiTransactionItems,
	}
}

func ToTransactionRequest(transactionRequest apiContract.TransactionRequest) transaction.TransactionRequest {
	transactionItemRequests := []transaction.TransactionItemRequest{}
	for _, item := range transactionRequest.TransactionItems {
		transactionItemRequests = append(transactionItemRequests, transaction.TransactionItemRequest{
			ProductId:      item.ProductId,
			Amount:         item.Amount,
			DiscountAmount: item.DiscountAmount,
		})
	}

	return transaction.TransactionRequest{
		Name:             transactionRequest.Name,
		TransactionItems: transactionItemRequests,
	}
}

func ToTransactionPayRequest(transactionPayRequest apiContract.TransactionPayRequest) transaction.TransactionPayRequest {
	return transaction.TransactionPayRequest{
		WalletId: transactionPayRequest.WalletId,
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
		DeletedAt:             wallet.DeletedAt,
		CreatedAt:             wallet.CreatedAt,
	}
}

func ToWalletRequest(walletRequest apiContract.WalletRequest) wallet.WalletRequest {
	return wallet.WalletRequest{
		Name:                  walletRequest.Name,
		Balance:               walletRequest.Balance,
		PaymentCostPercentage: walletRequest.PaymentCostPercentage,
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

func ToWalletTransferRequest(walletTransferRequest apiContract.WalletTransferRequest) wallet.WalletTransferRequest {
	return wallet.WalletTransferRequest{
		Amount:     walletTransferRequest.Amount,
		ToWalletId: walletTransferRequest.ToWalletId,
	}
}
