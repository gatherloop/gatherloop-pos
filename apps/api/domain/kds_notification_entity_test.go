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

		message := domain.BuildKdsPushMessage(transaction, "default")

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

		message := domain.BuildKdsPushMessage(transaction, "default")

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

		message := domain.BuildKdsPushMessage(transaction, "default")

		assert.Equal(t, "BAR: 2× Kopi Susu Gula Aren, 1× Americano · KITCHEN: 1× Sandwich", message.Body)
	})

	t.Run("a bar-only transaction's body carries just its own label", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
			TransactionItems: []domain.TransactionItem{
				kdsItem("BAR", 2, "Kopi Susu Gula Aren"),
			},
		}

		message := domain.BuildKdsPushMessage(transaction, "default")

		assert.Equal(t, "BAR: 2× Kopi Susu Gula Aren", message.Body)
		assert.NotContains(t, message.Body, "KITCHEN")
	})

	t.Run("the sound is the configured one", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, "orders-v1-sound")

		assert.Equal(t, "orders-v1-sound", message.Sound)
	})

	t.Run("the priority is high so a locked, screen-off phone is woken", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			TransactionItems:  []domain.TransactionItem{kdsItem("BAR", 1, "Americano")},
		}

		message := domain.BuildKdsPushMessage(transaction, "default")

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

		message := domain.BuildKdsPushMessage(transaction, "default")

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

		message := domain.BuildKdsPushMessage(transaction, "default")

		assert.Equal(t, int64(999), message.Data["transactionId"])
		assert.Equal(t, int64(12), message.Data["transactionNumber"])
		assert.Equal(t, []string{"BAR", "KITCHEN"}, message.Data["stations"])
		assert.Equal(t, "order", message.Data["source"])
	})
}
