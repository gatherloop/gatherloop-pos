package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildGuestWhatsappMessage(t *testing.T) {
	t.Run("a QRIS order with a noted, multi-option item and a plain single item renders exactly", func(t *testing.T) {
		transaction := domain.Transaction{
			Id:                999,
			TransactionNumber: 12,
			Name:              "Andi",
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
			TransactionItems: []domain.TransactionItem{
				{
					ProductName: "Coffee Latte",
					Amount:      2,
					Note:        "tanpa sedotan",
					Values: []domain.TransactionItemValue{
						{OptionName: "Temperature", OptionValueName: "Hot"},
						{OptionName: "Flavor", OptionValueName: "Vanilla"},
					},
				},
				{
					ProductName: "Croissant",
					Amount:      1,
				},
			},
		}

		message := domain.BuildGuestWhatsappMessage(
			transaction,
			domain.Payment{Method: domain.PaymentMethodQris},
			"https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=q3Vd0bX9pL2sR8tY1wZa7c",
		)

		expected := "Halo *Andi*, pesanan Anda sudah siap diambil! 🎉\n" +
			"\n" +
			"*No. Pesanan:* #12\n" +
			"*Nama:* Andi\n" +
			"*Meja:* Meja 4\n" +
			"*Pembayaran:* QRIS\n" +
			"\n" +
			"*Pesanan:*\n" +
			"2x Coffee Latte - Hot - Vanilla\n" +
			"_Catatan: tanpa sedotan_\n" +
			"1x Croissant\n" +
			"\n" +
			"Tunjukkan halaman ini ke kasir untuk mengambil pesanan:\n" +
			"https://order.gatherloop.id/orders/ORD7K2M9QX4B1HZT?k=q3Vd0bX9pL2sR8tY1wZa7c\n" +
			"\n" +
			"Terima kasih!"
		assert.Equal(t, expected, message)
	})

	t.Run("the transaction number is used, not the id", func(t *testing.T) {
		transaction := domain.Transaction{
			Id:                999,
			TransactionNumber: 12,
			Name:              "Andi",
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.Contains(t, message, "#12")
		assert.NotContains(t, message, "#999")
	})

	t.Run("cash renders as Tunai", func(t *testing.T) {
		transaction := domain.Transaction{TransactionNumber: 1, Name: "Budi"}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodCash}, "https://order.example/o")

		assert.Contains(t, message, "*Pembayaran:* Tunai")
	})

	t.Run("qris renders as QRIS", func(t *testing.T) {
		transaction := domain.Transaction{TransactionNumber: 1, Name: "Budi"}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.Contains(t, message, "*Pembayaran:* QRIS")
	})

	t.Run("an unpaid COD order shows the COD label and a pay-at-pickup line with the total", func(t *testing.T) {
		transaction := domain.Transaction{TransactionNumber: 12, Name: "Andi", Total: 45000}

		message := domain.BuildGuestWhatsappMessage(
			transaction,
			domain.Payment{Method: domain.PaymentMethodCod, Status: domain.PaymentStatePending},
			"https://order.example/o",
		)

		assert.Contains(t, message, "*Pembayaran:* COD — bayar di kasir")
		assert.Contains(t, message, "Siapkan pembayaran *Rp 45.000* saat mengambil pesanan di kasir.")
	})

	t.Run("a paid COD order has no pay-at-pickup line", func(t *testing.T) {
		transaction := domain.Transaction{TransactionNumber: 12, Name: "Andi", Total: 45000}

		message := domain.BuildGuestWhatsappMessage(
			transaction,
			domain.Payment{Method: domain.PaymentMethodCod, Status: domain.PaymentStatePaid},
			"https://order.example/o",
		)

		assert.Contains(t, message, "*Pembayaran:* COD")
		assert.NotContains(t, message, "Siapkan pembayaran")
	})

	t.Run("a non-COD order has no pay-at-pickup line", func(t *testing.T) {
		transaction := domain.Transaction{TransactionNumber: 1, Name: "Budi", Total: 45000}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.NotContains(t, message, "Siapkan pembayaran")
	})

	t.Run("an item without options has no trailing dash segment", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 1,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				{ProductName: "Croissant", Amount: 1},
			},
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.Contains(t, message, "1x Croissant")
	})

	t.Run("an item without a note has no Catatan line", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 1,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				{ProductName: "Croissant", Amount: 1},
			},
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.NotContains(t, message, "Catatan")
	})

	t.Run("a whole-number amount prints without decimals", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 1,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				{ProductName: "Croissant", Amount: 3},
			},
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.Contains(t, message, "3x Croissant")
	})

	t.Run("a fractional amount keeps its decimals", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 1,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				{ProductName: "Kopi Susu (kg)", Amount: 1.5},
			},
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/o")

		assert.Contains(t, message, "1.50x Kopi Susu (kg)")
	})

	t.Run("a single-item order renders one item line and the link", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 7,
			Name:              "Citra",
			TransactionItems: []domain.TransactionItem{
				{ProductName: "Americano", Amount: 1},
			},
		}

		message := domain.BuildGuestWhatsappMessage(transaction, domain.Payment{Method: domain.PaymentMethodQris}, "https://order.example/orders/ORD1?k=abc")

		expected := "Halo *Citra*, pesanan Anda sudah siap diambil! 🎉\n" +
			"\n" +
			"*No. Pesanan:* #7\n" +
			"*Nama:* Citra\n" +
			"*Meja:* \n" +
			"*Pembayaran:* QRIS\n" +
			"\n" +
			"*Pesanan:*\n" +
			"1x Americano\n" +
			"\n" +
			"Tunjukkan halaman ini ke kasir untuk mengambil pesanan:\n" +
			"https://order.example/orders/ORD1?k=abc\n" +
			"\n" +
			"Terima kasih!"
		assert.Equal(t, expected, message)
	})
}
