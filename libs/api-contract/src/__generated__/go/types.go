package apicontract

import "time"

// ErrorCode

type ErrorCode string

const (
	INTERNAL_SERVER_ERROR ErrorCode = "internal_server_error"
	BAD_REQUEST           ErrorCode = "bad_request"
	NOT_FOUND             ErrorCode = "not_found"
	UNAUTHORIZED          ErrorCode = "unauthorized"
)

// Base types

type Error struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
}

type SuccessResponse struct {
	Success bool `json:"success"`
}

type MetaPage struct {
	Total int64 `json:"total"`
}

// Auth

type AuthLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthLoginResponse struct {
	Data string `json:"data"`
}

// Category

type Category struct {
	Id        int64      `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

type CategoryRequest struct {
	Name string `json:"name"`
}

type CategoryCreateResponse struct {
	Data Category `json:"data"`
}

type CategoryUpdateByIdResponse struct {
	Data Category `json:"data"`
}

type CategoryFindByIdResponse struct {
	Data Category `json:"data"`
}

type CategoryListResponse struct {
	Data []Category `json:"data"`
}

// Material

type Material struct {
	Id               int64      `json:"id"`
	Name             string     `json:"name"`
	Description      *string    `json:"description,omitempty"`
	Price            float32    `json:"price"`
	Unit             string     `json:"unit"`
	WeeklyUsage      float32    `json:"weeklyUsage"`
	PurchaseUnit     string     `json:"purchaseUnit"`
	PurchaseUnitSize float32    `json:"purchaseUnitSize"`
	MinimumStock     int32      `json:"minimumStock"`
	NormalStock      int32      `json:"normalStock"`
	CreatedAt        time.Time  `json:"createdAt"`
	DeletedAt        *time.Time `json:"deletedAt,omitempty"`
}

type MaterialRequest struct {
	Name             string  `json:"name"`
	Description      *string `json:"description,omitempty"`
	Price            float32 `json:"price"`
	Unit             string  `json:"unit"`
	PurchaseUnit     string  `json:"purchaseUnit"`
	PurchaseUnitSize float32 `json:"purchaseUnitSize"`
	MinimumStock     int32   `json:"minimumStock"`
	NormalStock      int32   `json:"normalStock"`
}

type MaterialCreateResponse struct {
	Data Material `json:"data"`
}

type MaterialUpdateByIdResponse struct {
	Data Material `json:"data"`
}

type MaterialFindByIdResponse struct {
	Data Material `json:"data"`
}

type MaterialListResponse struct {
	Data []Material `json:"data"`
	Meta MetaPage   `json:"meta"`
}

// Supplier

type Supplier struct {
	Id        int64      `json:"id"`
	Name      string     `json:"name"`
	Phone     *string    `json:"phone,omitempty"`
	Address   string     `json:"address"`
	MapsLink  string     `json:"mapsLink"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

type SupplierRequest struct {
	Name     string  `json:"name"`
	Phone    *string `json:"phone,omitempty"`
	Address  string  `json:"address"`
	MapsLink string  `json:"mapsLink"`
}

type SupplierCreateResponse struct {
	Data Supplier `json:"data"`
}

type SupplierUpdateByIdResponse struct {
	Data Supplier `json:"data"`
}

type SupplierFindByIdResponse struct {
	Data Supplier `json:"data"`
}

type SupplierListResponse struct {
	Data []Supplier `json:"data"`
	Meta MetaPage   `json:"meta"`
}

// Wallet

type Wallet struct {
	Id                    int64      `json:"id"`
	Name                  string     `json:"name"`
	Balance               float32    `json:"balance"`
	PaymentCostPercentage float32    `json:"paymentCostPercentage"`
	IsCashless            bool       `json:"isCashless"`
	DeletedAt             *time.Time `json:"deletedAt,omitempty"`
	CreatedAt             time.Time  `json:"createdAt"`
}

type WalletRequest struct {
	Name                  string  `json:"name"`
	Balance               float32 `json:"balance"`
	PaymentCostPercentage float32 `json:"paymentCostPercentage"`
	IsCashless            bool    `json:"isCashless"`
}

type WalletTransfer struct {
	Id           int64      `json:"id"`
	CreatedAt    time.Time  `json:"createdAt"`
	Amount       float32    `json:"amount"`
	FromWalletId int64      `json:"fromWalletId"`
	FromWallet   Wallet     `json:"fromWallet"`
	ToWalletId   int64      `json:"toWalletId"`
	ToWallet     Wallet     `json:"toWallet"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty"`
}
// Note: WalletTransfer field order matches domain.WalletTransfer for direct type conversion.

type WalletTransferRequest struct {
	Amount     float32 `json:"amount"`
	ToWalletId int64   `json:"toWalletId"`
}

type WalletCreateResponse struct {
	Data Wallet `json:"data"`
}

type WalletUpdateByIdResponse struct {
	Data Wallet `json:"data"`
}

type WalletFindByIdResponse struct {
	Data Wallet `json:"data"`
}

type WalletListResponse struct {
	Data []Wallet `json:"data"`
}

type WalletTransferCreateResponse struct {
	Data WalletTransfer `json:"data"`
}

type WalletTransferListResponse struct {
	Data []WalletTransfer `json:"data"`
}

// Option / OptionValue

type OptionValue struct {
	Id   int64  `json:"id"`
	Name string `json:"name"`
}

type Option struct {
	Id     int64         `json:"id"`
	Name   string        `json:"name"`
	Values []OptionValue `json:"values"`
}

type OptionValueRequest struct {
	Id   *int64 `json:"id,omitempty"`
	Name string `json:"name"`
}

type OptionRequest struct {
	Id     *int64               `json:"id,omitempty"`
	Name   string               `json:"name"`
	Values []OptionValueRequest `json:"values"`
}

// Product

type Product struct {
	Id          int64      `json:"id"`
	CategoryId  int64      `json:"categoryId"`
	Category    Category   `json:"category"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	ImageUrl    string     `json:"imageUrl"`
	Options     []Option   `json:"options"`
	SaleType    string     `json:"saleType"`
	CreatedAt   time.Time  `json:"createdAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

type ProductRequest struct {
	CategoryId  int64          `json:"categoryId"`
	Name        string         `json:"name"`
	Description *string        `json:"description,omitempty"`
	ImageUrl    string         `json:"imageUrl"`
	Options     []OptionRequest `json:"options"`
	SaleType    string         `json:"saleType"`
}

type ProductCreateResponse struct {
	Data Product `json:"data"`
}

type ProductUpdateByIdResponse struct {
	Data Product `json:"data"`
}

type ProductFindByIdResponse struct {
	Data Product `json:"data"`
}

type ProductListResponse struct {
	Data []Product `json:"data"`
	Meta MetaPage  `json:"meta"`
}

// PricingTier

type PricingTier struct {
	UpToMinutes int64   `json:"upToMinutes"`
	Price       float32 `json:"price"`
}

// VariantMaterial / VariantValue / Variant

type VariantMaterial struct {
	Id         int64      `json:"id"`
	VariantId  int64      `json:"variantId"`
	MaterialId int64      `json:"materialId"`
	Material   Material   `json:"material"`
	Amount     float32    `json:"amount"`
	CreatedAt  time.Time  `json:"createdAt"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
}

type VariantValue struct {
	Id            int64       `json:"id"`
	VariantId     int64       `json:"variantId"`
	OptionValueId int64       `json:"optionValueId"`
	OptionValue   OptionValue `json:"optionValue"`
}

type Variant struct {
	Id           int64             `json:"id"`
	ProductId    int64             `json:"productId"`
	Product      Product           `json:"product"`
	Name         string            `json:"name"`
	Price        float32           `json:"price"`
	Description  *string           `json:"description,omitempty"`
	Materials    []VariantMaterial `json:"materials"`
	Values       []VariantValue    `json:"values"`
	PricingTiers []PricingTier     `json:"pricingTiers"`
	CreatedAt    time.Time         `json:"createdAt"`
	DeletedAt    *time.Time        `json:"deletedAt,omitempty"`
}

type VariantMaterialRequest struct {
	Id         *int64  `json:"id,omitempty"`
	MaterialId int64   `json:"materialId"`
	Amount     float32 `json:"amount"`
}

type VariantValueRequest struct {
	Id            *int64 `json:"id,omitempty"`
	OptionValueId int64  `json:"optionValueId"`
}

type VariantRequest struct {
	ProductId    int64                    `json:"productId"`
	Name         string                   `json:"name"`
	Price        float32                  `json:"price"`
	Description  *string                  `json:"description,omitempty"`
	Materials    []VariantMaterialRequest `json:"materials"`
	Values       []VariantValueRequest    `json:"values"`
	PricingTiers []PricingTier            `json:"pricingTiers"`
}

type VariantCreateResponse struct {
	Data Variant `json:"data"`
}

type VariantUpdateByIdResponse struct {
	Data Variant `json:"data"`
}

type VariantFindByIdResponse struct {
	Data Variant `json:"data"`
}

type VariantListResponse struct {
	Data []Variant `json:"data"`
	Meta MetaPage  `json:"meta"`
}

// Budget

type Budget struct {
	Id         int64      `json:"id"`
	Name       string     `json:"name"`
	Percentage float32    `json:"percentage"`
	Balance    float32    `json:"balance"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type BudgetRequest struct {
	Name       string  `json:"name"`
	Percentage float32 `json:"percentage"`
	Balance    float32 `json:"balance"`
}

type BudgetCreateResponse struct {
	Data Budget `json:"data"`
}

type BudgetUpdateByIdResponse struct {
	Data Budget `json:"data"`
}

type BudgetFindByIdResponse struct {
	Data Budget `json:"data"`
}

type BudgetListResponse struct {
	Data []Budget `json:"data"`
}

// Transaction

type TransactionItemValue struct {
	Id                int64  `json:"id"`
	TransactionItemId int64  `json:"transactionItemId"`
	OptionName        string `json:"optionName"`
	OptionValueName   string `json:"optionValueName"`
}

type TransactionItem struct {
	Id             int64                  `json:"id"`
	TransactionId  int64                  `json:"transactionId"`
	VariantId      int64                  `json:"variantId"`
	Variant        Variant                `json:"variant"`
	Amount         float32                `json:"amount"`
	Price          float32                `json:"price"`
	DiscountAmount float32                `json:"discountAmount"`
	Subtotal       float32                `json:"subtotal"`
	Note           string                 `json:"note"`
	ProductName    string                 `json:"productName"`
	Values         []TransactionItemValue `json:"values"`
}

type TransactionCoupon struct {
	Id            int64  `json:"id"`
	TransactionId int64  `json:"transactionId"`
	CouponId      int64  `json:"couponId"`
	Coupon        Coupon `json:"coupon"`
	Type          string `json:"type"`
	Amount        int64  `json:"amount"`
}

type Transaction struct {
	Id                 int64               `json:"id"`
	CreatedAt          time.Time           `json:"createdAt"`
	Name               string              `json:"name"`
	OrderNumber        int64               `json:"orderNumber"`
	WalletId           *int64              `json:"walletId,omitempty"`
	Wallet             *Wallet             `json:"wallet,omitempty"`
	Total              float32             `json:"total"`
	TotalIncome        float32             `json:"totalIncome"`
	TransactionItems   []TransactionItem   `json:"transactionItems"`
	TransactionCoupons []TransactionCoupon `json:"transactionCoupons"`
	PaidAmount         float32             `json:"paidAmount"`
	PaidAt             *time.Time          `json:"paidAt,omitempty"`
	DeletedAt          *time.Time          `json:"deletedAt,omitempty"`
}

type TransactionItemRequest struct {
	Id             *int64  `json:"id,omitempty"`
	VariantId      int64   `json:"variantId"`
	Amount         float32 `json:"amount"`
	Note           string  `json:"note"`
	DiscountAmount float32 `json:"discountAmount"`
}

type TransactionCouponRequest struct {
	Id       *int64 `json:"id,omitempty"`
	CouponId int64  `json:"couponId"`
}

type TransactionRequest struct {
	Name               string                     `json:"name"`
	OrderNumber        int64                      `json:"orderNumber"`
	TransactionItems   []TransactionItemRequest   `json:"transactionItems"`
	TransactionCoupons []TransactionCouponRequest `json:"transactionCoupons"`
}

type TransactionPayRequest struct {
	WalletId   int64   `json:"walletId"`
	PaidAmount float32 `json:"paidAmount"`
}

type TransactionStatistic struct {
	Date        string  `json:"date"`
	Total       int32   `json:"total"`
	TotalIncome float32 `json:"totalIncome"`
}

type TransactionCreateResponse struct {
	Data Transaction `json:"data"`
}

type TransactionUpdateByIdResponse struct {
	Data Transaction `json:"data"`
}

type TransactionFindByIdResponse struct {
	Data Transaction `json:"data"`
}

type TransactionListResponse struct {
	Data []Transaction `json:"data"`
	Meta MetaPage      `json:"meta"`
}

type TransactionStatisticResponse struct {
	Data []TransactionStatistic `json:"data"`
}

// Rental

type Rental struct {
	Id           int64         `json:"id"`
	Code         string        `json:"code"`
	Name         string        `json:"name"`
	VariantId    int64         `json:"variantId"`
	Variant      Variant       `json:"variant"`
	CheckinAt    time.Time     `json:"checkinAt"`
	CheckoutAt   *time.Time    `json:"checkoutAt,omitempty"`
	CreatedAt    time.Time     `json:"createdAt"`
	PricingTiers []PricingTier `json:"pricingTiers"`
	Total        float32       `json:"total"`
}

type RentalRequest struct {
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	VariantId int64     `json:"variantId"`
	CheckinAt time.Time `json:"checkinAt"`
}

type RentalFindByIdResponse struct {
	Data Rental `json:"data"`
}

type RentalListResponse struct {
	Data []Rental `json:"data"`
	Meta MetaPage `json:"meta"`
}

type RentalCheckinResponse struct {
	Data []Rental `json:"data"`
}

type RentalCheckoutResponse struct {
	Data Transaction `json:"data"`
}

// Expense

type ExpenseItem struct {
	Id        int64   `json:"id"`
	Name      string  `json:"name"`
	Unit      string  `json:"unit"`
	Price     float32 `json:"price"`
	Amount    float32 `json:"amount"`
	Subtotal  float32 `json:"subtotal"`
	ExpenseId int64   `json:"expenseId"`
}

type Expense struct {
	Id           int64         `json:"id"`
	WalletId     int64         `json:"walletId"`
	Wallet       Wallet        `json:"wallet"`
	BudgetId     int64         `json:"budgetId"`
	Budget       Budget        `json:"budget"`
	Total        float32       `json:"total"`
	ExpenseItems []ExpenseItem `json:"expenseItems"`
	CreatedAt    time.Time     `json:"createdAt"`
	DeletedAt    *time.Time    `json:"deletedAt,omitempty"`
}

type ExpenseItemRequest struct {
	Id     *int64  `json:"id,omitempty"`
	Name   string  `json:"name"`
	Unit   string  `json:"unit"`
	Price  float32 `json:"price"`
	Amount float32 `json:"amount"`
}

type ExpenseRequest struct {
	WalletId     int64                `json:"walletId"`
	BudgetId     int64                `json:"budgetId"`
	ExpenseItems []ExpenseItemRequest `json:"expenseItems"`
}

type ExpenseCreateResponse struct {
	Data Expense `json:"data"`
}

type ExpenseUpdateByIdResponse struct {
	Data Expense `json:"data"`
}

type ExpenseFindByIdResponse struct {
	Data Expense `json:"data"`
}

type ExpenseListResponse struct {
	Data []Expense `json:"data"`
	Meta MetaPage  `json:"meta"`
}

// Calculation

type CalculationItem struct {
	Id            int64   `json:"id"`
	CalculationId int64   `json:"calculationId"`
	Price         float32 `json:"price"`
	Amount        int64   `json:"amount"`
	Subtotal      float32 `json:"subtotal"`
}

type Calculation struct {
	Id               int64             `json:"id"`
	WalletId         int64             `json:"walletId"`
	Wallet           Wallet            `json:"wallet"`
	TotalWallet      float32           `json:"totalWallet"`
	TotalCalculation float32           `json:"totalCalculation"`
	CalculationItems []CalculationItem `json:"calculationItems"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
	CompletedAt      *time.Time        `json:"completedAt,omitempty"`
	DeletedAt        *time.Time        `json:"deletedAt,omitempty"`
}

type CalculationItemRequest struct {
	Id     *int64  `json:"id,omitempty"`
	Price  float32 `json:"price"`
	Amount int64   `json:"amount"`
}

type CalculationRequest struct {
	WalletId         int64                    `json:"walletId"`
	CalculationItems []CalculationItemRequest `json:"calculationItems"`
}

type CalculationCreateResponse struct {
	Data Calculation `json:"data"`
}

type CalculationUpdateByIdResponse struct {
	Data Calculation `json:"data"`
}

type CalculationFindByIdResponse struct {
	Data Calculation `json:"data"`
}

type CalculationListResponse struct {
	Data []Calculation `json:"data"`
}

// Coupon

type Coupon struct {
	Id        int64      `json:"id"`
	Code      string     `json:"code"`
	Type      string     `json:"type"`
	Amount    int64      `json:"amount"`
	CreatedAt time.Time  `json:"createdAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

type CouponRequest struct {
	Code   string `json:"code"`
	Type   string `json:"type"`
	Amount int64  `json:"amount"`
}

type CouponCreateResponse struct {
	Data Coupon `json:"data"`
}

type CouponUpdateByIdResponse struct {
	Data Coupon `json:"data"`
}

type CouponFindByIdResponse struct {
	Data Coupon `json:"data"`
}

type CouponListResponse struct {
	Data []Coupon `json:"data"`
}

// ChecklistTemplate

type ChecklistTemplateSubItem struct {
	Id           int64     `json:"id"`
	Name         string    `json:"name"`
	DisplayOrder int64     `json:"displayOrder"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ChecklistTemplateItem struct {
	Id           int64                      `json:"id"`
	Name         string                     `json:"name"`
	Description  *string                    `json:"description,omitempty"`
	DisplayOrder int64                      `json:"displayOrder"`
	SubItems     []ChecklistTemplateSubItem `json:"subItems"`
	CreatedAt    time.Time                  `json:"createdAt"`
	UpdatedAt    time.Time                  `json:"updatedAt"`
}

type ChecklistTemplate struct {
	Id          int64                   `json:"id"`
	Name        string                  `json:"name"`
	Description *string                 `json:"description,omitempty"`
	Items       []ChecklistTemplateItem `json:"items"`
	CreatedAt   time.Time               `json:"createdAt"`
	UpdatedAt   time.Time               `json:"updatedAt"`
}

type ChecklistTemplateSubItemRequest struct {
	Name         string `json:"name"`
	DisplayOrder int64  `json:"displayOrder"`
}

type ChecklistTemplateItemRequest struct {
	Name         string                            `json:"name"`
	Description  *string                           `json:"description,omitempty"`
	DisplayOrder int64                             `json:"displayOrder"`
	SubItems     []ChecklistTemplateSubItemRequest `json:"subItems"`
}

type ChecklistTemplateRequest struct {
	Name        string                         `json:"name"`
	Description *string                        `json:"description,omitempty"`
	Items       []ChecklistTemplateItemRequest `json:"items"`
}

type ChecklistTemplateCreateResponse struct {
	Data ChecklistTemplate `json:"data"`
}

type ChecklistTemplateUpdateByIdResponse struct {
	Data ChecklistTemplate `json:"data"`
}

type ChecklistTemplateFindByIdResponse struct {
	Data ChecklistTemplate `json:"data"`
}

type ChecklistTemplateListResponse struct {
	Data []ChecklistTemplate `json:"data"`
	Meta MetaPage            `json:"meta"`
}

// ChecklistSession

type ChecklistSessionSubItem struct {
	Id                         int64      `json:"id"`
	ChecklistSessionItemId     int64      `json:"checklistSessionItemId"`
	ChecklistTemplateSubItemId *int64     `json:"checklistTemplateSubItemId,omitempty"`
	Name                       string     `json:"name"`
	DisplayOrder               int64      `json:"displayOrder"`
	CompletedAt                *time.Time `json:"completedAt,omitempty"`
	CreatedAt                  time.Time  `json:"createdAt"`
	UpdatedAt                  time.Time  `json:"updatedAt"`
}

type ChecklistSessionItem struct {
	Id                      int64                      `json:"id"`
	ChecklistSessionId      int64                      `json:"checklistSessionId"`
	ChecklistTemplateItemId *int64                     `json:"checklistTemplateItemId,omitempty"`
	Name                    string                     `json:"name"`
	Description             *string                    `json:"description,omitempty"`
	DisplayOrder            int64                      `json:"displayOrder"`
	CompletedAt             *time.Time                 `json:"completedAt,omitempty"`
	SubItems                []ChecklistSessionSubItem  `json:"subItems"`
	CreatedAt               time.Time                  `json:"createdAt"`
	UpdatedAt               time.Time                  `json:"updatedAt"`
}

type ChecklistSession struct {
	Id                  int64                  `json:"id"`
	ChecklistTemplateId int64                  `json:"checklistTemplateId"`
	ChecklistTemplate   *ChecklistTemplate     `json:"checklistTemplate,omitempty"`
	Date                string                 `json:"date"`
	CompletedAt         *time.Time             `json:"completedAt,omitempty"`
	Items               []ChecklistSessionItem `json:"items"`
	CreatedAt           time.Time              `json:"createdAt"`
	UpdatedAt           time.Time              `json:"updatedAt"`
}

type ChecklistSessionRequest struct {
	ChecklistTemplateId int64  `json:"checklistTemplateId"`
	Date                string `json:"date"`
}

type ChecklistSessionCreateResponse struct {
	Data ChecklistSession `json:"data"`
}

type ChecklistSessionFindByIdResponse struct {
	Data ChecklistSession `json:"data"`
}

type ChecklistSessionListResponse struct {
	Data []ChecklistSession `json:"data"`
	Meta MetaPage           `json:"meta"`
}

type ChecklistSessionItemCheckResponse struct {
	Data ChecklistSessionItem `json:"data"`
}

type ChecklistSessionItemUncheckResponse struct {
	Data ChecklistSessionItem `json:"data"`
}

type ChecklistSessionSubItemCheckResponse struct {
	Data ChecklistSessionSubItem `json:"data"`
}

type ChecklistSessionSubItemUncheckResponse struct {
	Data ChecklistSessionSubItem `json:"data"`
}

// StockCheck

type StockCheckItem struct {
	Id               int64     `json:"id"`
	StockCheckId     int64     `json:"stockCheckId"`
	MaterialId       int64     `json:"materialId"`
	CurrentStock     int       `json:"currentStock"`
	MaterialName     string    `json:"materialName"`
	Price            float32   `json:"price"`
	PurchaseUnit     string    `json:"purchaseUnit"`
	PurchaseUnitSize float32   `json:"purchaseUnitSize"`
	MinimumStock     int       `json:"minimumStock"`
	NormalStock      int       `json:"normalStock"`
	CreatedAt        time.Time `json:"createdAt"`
}

type StockCheck struct {
	Id        int64            `json:"id"`
	CreatedAt time.Time        `json:"createdAt"`
	DeletedAt *time.Time       `json:"deletedAt,omitempty"`
	Items     []StockCheckItem `json:"items"`
}

type StockCheckItemRequest struct {
	MaterialId   int64 `json:"materialId"`
	CurrentStock int   `json:"currentStock"`
}

type StockCheckRequest struct {
	Items []StockCheckItemRequest `json:"items"`
}

type StockCheckUpdateRequest struct {
	Items []StockCheckItemRequest `json:"items"`
}

type StockCheckCreateResponse struct {
	Data StockCheck `json:"data"`
}

type StockCheckUpdateByIdResponse struct {
	Data StockCheck `json:"data"`
}

type StockCheckFindByIdResponse struct {
	Data StockCheck `json:"data"`
}

type StockCheckListResponse struct {
	Data []StockCheck `json:"data"`
	Meta MetaPage     `json:"meta"`
}

// PurchaseList

type PurchaseListItem struct {
	MaterialId       int64   `json:"materialId"`
	MaterialName     string  `json:"materialName"`
	CurrentStock     int     `json:"currentStock"`
	MinimumStock     int     `json:"minimumStock"`
	NormalStock      int     `json:"normalStock"`
	PurchaseUnit     string  `json:"purchaseUnit"`
	PurchaseUnitSize float32 `json:"purchaseUnitSize"`
	PurchaseQuantity int     `json:"purchaseQuantity"`
	EstimatedCost    float64 `json:"estimatedCost"`
}

type PurchaseList struct {
	StockCheckId       int64              `json:"stockCheckId"`
	StockCheckDate     string             `json:"stockCheckDate"`
	TotalEstimatedCost float64            `json:"totalEstimatedCost"`
	Items              []PurchaseListItem `json:"items"`
}

type PurchaseListResponse struct {
	Data PurchaseList `json:"data"`
}
