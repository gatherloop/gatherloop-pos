package domain

import (
	"fmt"
	"strings"
)

// BuildGuestWhatsappMessage is pure and re-derived at send time, mirroring BuildGuestPushMessage:
// a completed transaction cannot be edited, so there is nothing to snapshot against. orderUrl is
// already built by BuildOrderStatusUrl; this function only shapes the message text (FR-6).
func BuildGuestWhatsappMessage(transaction Transaction, method PaymentMethod, orderUrl string) string {
	sections := []string{
		fmt.Sprintf("Halo *%s*, pesanan Anda sudah siap diambil! 🎉", transaction.Name),
		strings.Join([]string{
			fmt.Sprintf("*No. Pesanan:* #%d", transaction.TransactionNumber),
			fmt.Sprintf("*Nama:* %s", transaction.Name),
			fmt.Sprintf("*Meja:* %s", guestOrderTableLabel(transaction)),
			fmt.Sprintf("*Pembayaran:* %s", guestWhatsappPaymentMethodLabel(method)),
		}, "\n"),
		strings.Join(append([]string{"*Pesanan:*"}, guestWhatsappItemLines(transaction)...), "\n"),
		fmt.Sprintf("Tunjukkan halaman ini ke kasir untuk mengambil pesanan:\n%s", orderUrl),
		"Terima kasih!",
	}

	return strings.Join(sections, "\n\n")
}

func guestWhatsappItemLines(transaction Transaction) []string {
	var lines []string
	for _, item := range transaction.TransactionItems {
		line := formatKdsItemAmount(item.Amount) + "x " + item.ProductName
		if len(item.Values) > 0 {
			values := make([]string, len(item.Values))
			for i, value := range item.Values {
				values[i] = value.OptionValueName
			}
			line += " - " + strings.Join(values, " - ")
		}
		lines = append(lines, line)

		if item.Note != "" {
			lines = append(lines, fmt.Sprintf("_Catatan: %s_", item.Note))
		}
	}
	return lines
}

func guestWhatsappPaymentMethodLabel(method PaymentMethod) string {
	if method == PaymentMethodCash {
		return "Tunai"
	}
	return "QRIS"
}

func guestOrderTableLabel(transaction Transaction) string {
	if transaction.Cart != nil && transaction.Cart.Table != nil {
		return transaction.Cart.Table.Label
	}
	return ""
}
