package api_contract

import "time"

// Error types
type ErrorCode string

const (
	INTERNAL_SERVER_ERROR ErrorCode = "internal_server_error"
	BAD_REQUEST           ErrorCode = "bad_request"
	NOT_FOUND             ErrorCode = "not_found"
	UNAUTHORIZED          ErrorCode = "unauthorized"
)

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
// Field order matches domain.Category for direct conversion
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
// Field order matches domain.Material for direct conversion
type Material struct {
	Id          int64      `json:"id"`
	Name        string     `json:"name"`
	Price       float32    `json:"price"`
	Unit        string     `json:"unit"`
	WeeklyUsage float32    `json:"weeklyUsage"`
	Description *string    `json:"description,omitempty"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type MaterialRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Price       float32 `json:"price"`
	Unit        string  `json:"unit"`
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
// Field order matches domain.Supplier for direct conversion
type Supplier struct {
	Id        int64      `json:"id"`
	Name      string     `json:"name"`
	Phone     *string    `json:"phone,omitempty"`
	Address   string     `json:"address"`
	MapsLink  string     `json:"mapsLink"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
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
// Field order matches domain.Wallet for direct conversion
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

// Budget
// Field order matches domain.Budget for direct conversion
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

// Product
type Option struct {
	Id     int64         `json:"id"`
	Name   string        `json:"name"`
	Values []OptionValue `json:"values"`
}

type OptionValue struct {
	Id   int64  `json:"id"`
	Name string `json:"name"`
}

type OptionRequest struct {
	Id     *int64               `json:"id,omitempty"`
	Name   string               `json:"name"`
	Values []OptionValueRequest `json:"values"`
}

type OptionValueRequest struct {
	Id   *int64 `json:"id,omitempty"`
	Name string `json:"name"`
}

type Product struct {
	Id          int64      `json:"id"`
	CategoryId  int64      `json:"categoryId"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	Category    Category   `json:"category"`
	ImageUrl    string     `json:"imageUrl"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	Options     []Option   `json:"options"`
	SaleType    string     `json:"saleType"`
}

type ProductRequest struct {
	CategoryId  int64           `json:"categoryId"`
	Name        string          `json:"name"`
	ImageUrl    string          `json:"imageUrl"`
	Description *string         `json:"description,omitempty"`
	Options     []OptionRequest `json:"options"`
	SaleType    string          `json:"saleType"`
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

// Variant
type VariantMaterial struct {
	Id         int64      `json:"id"`
	VariantId  int64      `json:"variantId"`
	MaterialId int64      `json:"materialId"`
	Material   Material   `json:"material"`
	Amount     float32    `json:"amount"`
	CreatedAt  time.Time  `json:"createdAt"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
}

type VariantMaterialRequest struct {
	Id         *int64  `json:"id,omitempty"`
	MaterialId int64   `json:"materialId"`
	Amount     float32 `json:"amount"`
}

type VariantValue struct {
	Id            int64       `json:"id"`
	VariantId     int64       `json:"variantId"`
	OptionValueId int64       `json:"optionValueId"`
	OptionValue   OptionValue `json:"optionValue"`
}

type VariantValueRequest struct {
	Id            *int64 `json:"id,omitempty"`
	OptionValueId int64  `json:"optionValueId"`
}

type Variant struct {
	Id          int64             `json:"id"`
	ProductId   int64             `json:"productId"`
	Product     Product           `json:"product"`
	Name        string            `json:"name"`
	Price       float32           `json:"price"`
	Description *string           `json:"description,omitempty"`
	Materials   []VariantMaterial `json:"materials"`
	DeletedAt   *time.Time        `json:"deletedAt,omitempty"`
	Values      []VariantValue    `json:"values"`
	CreatedAt   time.Time         `json:"createdAt"`
}

type VariantRequest struct {
	ProductId   int64                    `json:"productId"`
	Name        string                   `json:"name"`
	Price       float32                  `json:"price"`
	Description *string                  `json:"description,omitempty"`
	Materials   []VariantMaterialRequest `json:"materials"`
	Values      []VariantValueRequest    `json:"values"`
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

// Transaction
type TransactionItem struct {
	Id             int64   `json:"id"`
	TransactionId  int64   `json:"transactionId"`
	VariantId      int64   `json:"variantId"`
	Variant        Variant `json:"variant"`
	Amount         float32 `json:"amount"`
	Price          float32 `json:"price"`
	DiscountAmount float32 `json:"discountAmount"`
	Subtotal       float32 `json:"subtotal"`
	Note           string  `json:"note"`
}

type TransactionItemRequest struct {
	Id             *int64  `json:"id,omitempty"`
	VariantId      int64   `json:"variantId"`
	Amount         float32 `json:"amount"`
	Note           string  `json:"note"`
	DiscountAmount float32 `json:"discountAmount"`
}

type TransactionCoupon struct {
	Id            int64  `json:"id"`
	TransactionId int64  `json:"transactionId"`
	CouponId      int64  `json:"couponId"`
	Coupon        Coupon `json:"coupon"`
	Type          string `json:"type"`
	Amount        int64  `json:"amount"`
}

type TransactionCouponRequest struct {
	Id       *int64 `json:"id,omitempty"`
	CouponId int64  `json:"couponId"`
}

type TransactionPayRequest struct {
	WalletId   int64   `json:"walletId"`
	PaidAmount float32 `json:"paidAmount"`
}

type Transaction struct {
	Id                 int64               `json:"id"`
	CreatedAt          time.Time           `json:"createdAt"`
	OrderNumber        int64               `json:"orderNumber"`
	Name               string              `json:"name"`
	WalletId           *int64              `json:"walletId,omitempty"`
	Wallet             *Wallet             `json:"wallet,omitempty"`
	Total              float32             `json:"total"`
	TotalIncome        float32             `json:"totalIncome"`
	PaidAmount         float32             `json:"paidAmount"`
	TransactionItems   []TransactionItem   `json:"transactionItems"`
	TransactionCoupons []TransactionCoupon `json:"transactionCoupons"`
	PaidAt             *time.Time          `json:"paidAt,omitempty"`
	DeletedAt          *time.Time          `json:"deletedAt,omitempty"`
}

type TransactionRequest struct {
	Name               string                     `json:"name"`
	OrderNumber        int64                      `json:"orderNumber"`
	TransactionItems   []TransactionItemRequest   `json:"transactionItems"`
	TransactionCoupons []TransactionCouponRequest `json:"transactionCoupons"`
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
	Id         int64      `json:"id"`
	Code       string     `json:"code"`
	Name       string     `json:"name"`
	VariantId  int64      `json:"variantId"`
	Variant    Variant    `json:"variant"`
	CheckinAt  time.Time  `json:"checkinAt"`
	CheckoutAt *time.Time `json:"checkoutAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
}

type RentalRequest struct {
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	VariantId int64     `json:"variantId"`
	CheckinAt time.Time `json:"checkinAt"`
}

type RentalCheckinResponse struct {
	Data []Rental `json:"data"`
}

type RentalCheckoutResponse struct {
	Data Transaction `json:"data"`
}

type RentalFindByIdResponse struct {
	Data Rental `json:"data"`
}

type RentalListResponse struct {
	Data []Rental `json:"data"`
	Meta MetaPage `json:"meta"`
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

type ExpenseItemRequest struct {
	Id     *int64  `json:"id,omitempty"`
	Name   string  `json:"name"`
	Unit   string  `json:"unit"`
	Price  float32 `json:"price"`
	Amount float32 `json:"amount"`
}

type Expense struct {
	Id           int64         `json:"id"`
	CreatedAt    time.Time     `json:"createdAt"`
	DeletedAt    *time.Time    `json:"deletedAt,omitempty"`
	WalletId     int64         `json:"walletId"`
	Wallet       Wallet        `json:"wallet"`
	BudgetId     int64         `json:"budgetId"`
	Budget       Budget        `json:"budget"`
	Total        float32       `json:"total"`
	ExpenseItems []ExpenseItem `json:"expenseItems"`
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

type CalculationItemRequest struct {
	Id     *int64  `json:"id,omitempty"`
	Price  float32 `json:"price"`
	Amount int64   `json:"amount"`
}

type Calculation struct {
	Id               int64             `json:"id"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
	DeletedAt        *time.Time        `json:"deletedAt,omitempty"`
	CompletedAt      *time.Time        `json:"completedAt,omitempty"`
	WalletId         int64             `json:"walletId"`
	Wallet           Wallet            `json:"wallet"`
	TotalWallet      float32           `json:"totalWallet"`
	TotalCalculation float32           `json:"totalCalculation"`
	CalculationItems []CalculationItem `json:"calculationItems"`
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
	Id                      int64      `json:"id"`
	ChecklistTemplateItemId int64      `json:"checklistTemplateItemId"`
	Name                    string     `json:"name"`
	DisplayOrder            int        `json:"displayOrder"`
	CreatedAt               time.Time  `json:"createdAt"`
	UpdatedAt               time.Time  `json:"updatedAt"`
	DeletedAt               *time.Time `json:"deletedAt,omitempty"`
}

type ChecklistTemplateItem struct {
	Id                  int64                      `json:"id"`
	ChecklistTemplateId int64                      `json:"checklistTemplateId"`
	Name                string                     `json:"name"`
	Description         *string                    `json:"description,omitempty"`
	DisplayOrder        int                        `json:"displayOrder"`
	SubItems            []ChecklistTemplateSubItem `json:"subItems"`
	CreatedAt           time.Time                  `json:"createdAt"`
	UpdatedAt           time.Time                  `json:"updatedAt"`
	DeletedAt           *time.Time                 `json:"deletedAt,omitempty"`
}

type ChecklistTemplate struct {
	Id          int64                   `json:"id"`
	Name        string                  `json:"name"`
	Description *string                 `json:"description,omitempty"`
	Items       []ChecklistTemplateItem `json:"items"`
	CreatedAt   time.Time               `json:"createdAt"`
	UpdatedAt   time.Time               `json:"updatedAt"`
	DeletedAt   *time.Time              `json:"deletedAt,omitempty"`
}

type ChecklistTemplateSubItemRequest struct {
	Id           *int64 `json:"id,omitempty"`
	Name         string `json:"name"`
	DisplayOrder int    `json:"displayOrder"`
}

type ChecklistTemplateItemRequest struct {
	Id           *int64                            `json:"id,omitempty"`
	Name         string                            `json:"name"`
	Description  *string                           `json:"description,omitempty"`
	DisplayOrder int                               `json:"displayOrder"`
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
