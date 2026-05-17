package domain

type MaterialSupplier struct {
	SupplierId   int64
	SupplierName string
	Address      string
	Phone        string
	PurchaseType string // "offline" | "online" | "delivery"
	PurchaseUrl  string
}

type MaterialSupplierInput struct {
	SupplierId   int64
	PurchaseType string
	PurchaseUrl  string
}
