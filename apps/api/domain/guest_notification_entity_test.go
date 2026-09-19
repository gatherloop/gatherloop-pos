package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildGuestPushMessage(t *testing.T) {
	t.Run("title carries the transaction number, not the id", func(t *testing.T) {
		transaction := domain.Transaction{
			Id:                999,
			TransactionNumber: 12,
			Name:              "Budi",
		}

		message := domain.BuildGuestPushMessage(transaction, "ORD-1")

		assert.Contains(t, message.Title, "#12")
		assert.NotContains(t, message.Title, "#999")
	})

	t.Run("the body carries the table label when the transaction has a table", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
			Cart:              &domain.Cart{Table: &domain.Table{Label: "Meja 4"}},
		}

		message := domain.BuildGuestPushMessage(transaction, "ORD-1")

		assert.Equal(t, "Silahkan ambil di kasir", message.Body)
	})

	t.Run("the tag carries the payment reference so a redelivery replaces rather than stacks", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
		}

		message := domain.BuildGuestPushMessage(transaction, "ORD-1")

		assert.Equal(t, "order-ORD-1", message.Tag)
	})

	t.Run("the url points to the order status page the guest was already on", func(t *testing.T) {
		transaction := domain.Transaction{
			TransactionNumber: 12,
			Name:              "Budi",
		}

		message := domain.BuildGuestPushMessage(transaction, "ORD-1")

		assert.Equal(t, "/orders/ORD-1", message.URL)
	})
}
