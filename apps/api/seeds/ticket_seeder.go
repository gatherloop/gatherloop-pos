package seeds

import (
	"time"

	"gorm.io/gorm"
)

// TicketSeeder seeds sample physical tickets (RFID code -> printed ticket number).
type TicketSeeder struct{}

func (TicketSeeder) Name() string { return "TicketSeeder" }

func (TicketSeeder) Seed(tx *gorm.DB) error {
	type Ticket struct {
		Id        int64
		Code      string
		Name      string
		CreatedAt time.Time
		DeletedAt *time.Time
	}

	tickets := []Ticket{
		{Code: "RFID-0001", Name: "Ticket 01", CreatedAt: time.Now()},
		{Code: "RFID-0002", Name: "Ticket 02", CreatedAt: time.Now()},
		{Code: "RFID-0003", Name: "Ticket 03", CreatedAt: time.Now()},
	}

	for i := range tickets {
		var count int64
		if err := tx.Table("tickets").Where("code = ?", tickets[i].Code).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("tickets").Create(&tickets[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
