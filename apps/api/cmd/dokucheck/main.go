package main

import (
	"apps/api/data/doku"
	"apps/api/domain"
	"apps/api/utils"
	"context"
	"fmt"
	"os"
	"time"
)

const probeAmount = 10000

func main() {
	_ = utils.LoadEnv()
	env := utils.GetEnv()

	privateKey, keyErr := doku.ParsePrivateKeyPEM(env.DokuPrivateKey)
	if keyErr != nil {
		fmt.Fprintln(os.Stderr, keyErr)
		os.Exit(1)
	}

	config := doku.Config{
		BaseURL:      env.DokuBaseURL,
		ClientId:     env.DokuClientId,
		ClientSecret: env.DokuClientSecret,
		PrivateKey:   privateKey,
		MerchantId:   env.DokuMerchantId,
		ChannelId:    env.DokuChannelId,
		TerminalId:   env.DokuTerminalId,
		PostalCode:   env.DokuPostalCode,
		FeeType:      env.DokuFeeType,
	}
	if configErr := config.Validate(); configErr != nil {
		fmt.Fprintln(os.Stderr, configErr)
		os.Exit(1)
	}

	fmt.Printf("baseUrl:    %s\n", config.BaseURL)
	fmt.Printf("clientId:   %s\n", config.ClientId)
	fmt.Printf("merchantId: %s\n", config.MerchantId)
	fmt.Printf("channelId:  %s\n", config.ChannelId)
	fmt.Printf("terminalId: %s\n", config.TerminalId)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client := doku.NewClient(config)

	if tokenErr := client.VerifyCredentials(ctx); tokenErr != nil {
		fmt.Fprintf(os.Stderr, "\naccess token rejected: %s\n", tokenErr.Message)
		fmt.Fprintln(os.Stderr, "\n\"Unauthorized. Unknown Client\" means DOKU does not recognise DOKU_CLIENT_ID for DOKU_BASE_URL. Check that:")
		fmt.Fprintln(os.Stderr, "  - the credentials come from the same environment as DOKU_BASE_URL (sandbox credentials are not valid on api.doku.com)")
		fmt.Fprintln(os.Stderr, "  - DOKU_CLIENT_ID is the SNAP client id, not the Checkout one")
		fmt.Fprintln(os.Stderr, "  - the public key matching DOKU_PRIVATE_KEY is uploaded under Integration > API Keys in the DOKU Back Office")
		os.Exit(1)
	}

	fmt.Println("\naccess token granted: credentials are valid")

	if len(os.Args) < 2 || os.Args[1] != "generate" {
		fmt.Println("\nrun `dokucheck generate` to also send a real qr-mpm-generate and print DOKU's reply")
		return
	}

	partnerReferenceNo, refErr := domain.GeneratePartnerReferenceNo()
	if refErr != nil {
		fmt.Fprintln(os.Stderr, refErr)
		os.Exit(1)
	}

	fmt.Printf("\ngenerating qris for %s...\n", partnerReferenceNo)

	qris, qrisErr := client.GenerateQris(ctx, domain.GenerateQrisInput{
		PartnerReferenceNo: partnerReferenceNo,
		Amount:             probeAmount,
		ExpiredAt:          time.Now().Add(time.Duration(env.DokuQrisExpirySeconds) * time.Second),
	})
	if qrisErr != nil {
		fmt.Fprintf(os.Stderr, "\ngenerate qris rejected: %s\n", qrisErr.Message)
		fmt.Fprintln(os.Stderr, "\nThe access token above already proves the credentials, so DOKU is refusing the QRIS request itself. Check that:")
		fmt.Fprintln(os.Stderr, "  - QRIS is activated for DOKU_MERCHANT_ID in the DOKU Back Office of this environment")
		fmt.Fprintln(os.Stderr, "  - DOKU_TERMINAL_ID is a terminal registered under that merchant (alphanumeric, 3-16 characters)")
		fmt.Fprintln(os.Stderr, "  - DOKU_MERCHANT_POSTAL_CODE and DOKU_QRIS_FEE_TYPE hold values DOKU accepts, or are left unset")
		os.Exit(1)
	}

	fmt.Printf("referenceNo: %s\n", qris.GatewayReferenceNo)
	fmt.Printf("qrContent:   %s\n", qris.QrContent)
}
