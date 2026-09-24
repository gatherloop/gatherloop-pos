package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildKdsPushMessage(t *testing.T) {
	t.Run("title carries the transaction number, not the id", func(t *testing.T) {
		transaction := domain.Transaction{
			Id:                999,
			TransactionNumber: 12,
			Source:            domain.TransactionSourcePos,
			Name:              "Budi",
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Contains(t, message.Title, "#12")
		assert.NotContains(t, message.Title, "#999")
	})

	t.Run("an order transaction's title names the table", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Table 4"}},
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Contains(t, message.Title, "Table 4")
	})

	t.Run("a mixed transaction's body carries both station labels in BAR-then-KITCHEN order", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 2, "Kopi Susu Gula Aren"),
				kdsItem("BAR", 1, "Americano"),
				kdsItem("KITCHEN", 1, "Sandwich"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, "BAR: 2× Kopi Susu Gula Aren, 1× Americano · KITCHEN: 1× Sandwich", message.Body)
	})

	t.Run("different variants of the same product are grouped into one line", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Coffee Latte"),
				kdsItem("BAR", 1, "Coffee Latte"),
				kdsItem("KITCHEN", 1, "Pancong"),
				kdsItem("KITCHEN", 1, "Pancong"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, "BAR: 2× Coffee Latte · KITCHEN: 2× Pancong", message.Body)
	})

	t.Run("a bar-only transaction's body carries just its own label", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 2, "Kopi Susu Gula Aren"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, "BAR: 2× Kopi Susu Gula Aren", message.Body)
		assert.NotContains(t, message.Body, "KITCHEN")
	})

	t.Run("the sound is the configured one", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "orders-v1-sound")

		assert.Equal(t, "orders-v1-sound", message.Sound)
	})

	t.Run("the priority is high so a locked, screen-off phone is woken", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, domain.KdsPushPriorityHigh, message.Priority)
	})

	t.Run("the body is truncated to four items plus a +N more suffix", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Item 1"),
				kdsItem("BAR", 1, "Item 2"),
				kdsItem("BAR", 1, "Item 3"),
				kdsItem("BAR", 1, "Item 4"),
				kdsItem("KITCHEN", 1, "Item 5"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, "BAR: 1× Item 1, 1× Item 2, 1× Item 3, 1× Item 4, +1 more", message.Body)
	})

	t.Run("the data payload carries the transaction id, number, stations and source", func(t *testing.T) {
		transaction := domain.Transaction{
			Id:                999,
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Americano"),
				kdsItem("KITCHEN", 1, "Sandwich"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, int64(999), message.Data["transactionId"])
		assert.Equal(t, int64(12), message.Data["transactionNumber"])
		assert.Equal(t, []string{"BAR", "KITCHEN"}, message.Data["stations"])
		assert.Equal(t, "order", message.Data["source"])
	})

	t.Run("the data payload carries the kind", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		orderPaid := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")
		cashPending := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindCashPending, "default")

		assert.Equal(t, "order_paid", orderPaid.Data["kind"])
		assert.Equal(t, "cash_pending", cashPending.Data["kind"])
	})

	t.Run("a cash_pending title and body lead with the amount to collect, table included", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
			Total:             45000,
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Kopi Susu"),
				kdsItem("BAR", 1, "Latte"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindCashPending, "default")

		assert.Equal(t, "Cash order #12 — Meja 4", message.Title)
		assert.Equal(t, "Collect Rp 45.000 at the counter · BAR: 1× Kopi Susu, 1× Latte", message.Body)
	})

	t.Run("a cash_pending notification with no station items renders the amount line alone", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
			Total:             25000,
			TransactionItems: []domain.TransactionItem{
				{
					Amount:      1,
					ProductName: "Board Game Ticket",
					Variant:     domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}},
				},
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindCashPending, "default")

		assert.Equal(t, "Collect Rp 25.000 at the counter", message.Body)
	})

	t.Run("a cash_cancelled title and body retract the till trip, table included", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
			Total:             45000,
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Kopi Susu"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindCashCancelled, "default")

		assert.Equal(t, "Cash order #12 cancelled — Meja 4", message.Title)
		assert.Equal(t, "Guest cancelled. Don't wait at the till.", message.Body)
		assert.Equal(t, "cash_cancelled", message.Data["kind"])
	})

	t.Run("order_paid's title and body are byte-for-byte unchanged by the kind switch", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Source:            domain.TransactionSourceOrder,
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
			Total:             45000,
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 1, "Kopi Susu"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, domain.KdsNotificationKindOrderPaid, "default")

		assert.Equal(t, "New order #12 — Meja 4", message.Title)
		assert.Equal(t, "BAR: 1× Kopi Susu", message.Body)
	})
}
