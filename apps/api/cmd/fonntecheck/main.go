package main

import (
	"apps/api/data/fonnte"
	"apps/api/domain"
	"apps/api/utils"
	"context"
	"flag"
	"fmt"
	"os"
	"time"
)

func main() {
	to := flag.String("to", "", "WhatsApp number to send a test message to, e.g. 0812xxxxxxx")
	flag.Parse()

	if *to == "" {
		fmt.Fprintln(os.Stderr, "usage: fonntecheck -to <whatsapp number>")
		os.Exit(1)
	}

	_ = utils.LoadEnv()
	env := utils.GetEnv()

	config := fonnte.Config{
		Token:   env.FonnteToken,
		BaseURL: env.FonnteBaseURL,
	}
	if err := config.Validate(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("baseUrl: %s\n", config.BaseURL)

	client := fonnte.NewClient(config)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	fmt.Printf("\nsending a test message to %s...\n", *to)

	result, sendErr := client.Send(ctx, domain.WhatsAppMessage{
		To:   *to,
		Body: "Test message from gatherloop-pos fonntecheck.",
	})
	if sendErr != nil {
		fmt.Fprintf(os.Stderr, "\nsend failed: %s\n", sendErr.Message)
		os.Exit(1)
	}

	fmt.Printf("\noutcome:            %s\n", result.Outcome)
	fmt.Printf("providerMessageId:  %s\n", result.ProviderMessageId)
	fmt.Printf("detail:             %s\n", result.Detail)

	if result.Outcome != domain.WhatsAppSendOutcomeAccepted {
		fmt.Fprintln(os.Stderr, "\nFonnte did not accept the message. Check that FONNTE_TOKEN belongs to a device that is connected in the Fonnte dashboard.")
		os.Exit(1)
	}

	fmt.Println("\naccepted: check the target phone for the message.")
}
