package main

import (
	"apps/api/data/doku"
	"apps/api/utils"
	"context"
	"flag"
	"fmt"
	"os"
	"time"
)

func main() {
	showCredentials := flag.Bool("show-credentials", false, "print credential values in full instead of redacting them")
	flag.Parse()

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
	}
	if configErr := config.Validate(); configErr != nil {
		fmt.Fprintln(os.Stderr, configErr)
		os.Exit(1)
	}

	fmt.Printf("baseUrl:    %s\n", config.BaseURL)
	fmt.Printf("clientId:   %s\n", format(config.ClientId, *showCredentials))
	fmt.Printf("merchantId: %s\n", format(config.MerchantId, *showCredentials))
	fmt.Printf("channelId:  %s\n", format(config.ChannelId, *showCredentials))

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if tokenErr := doku.NewClient(config).VerifyCredentials(ctx); tokenErr != nil {
		fmt.Fprintf(os.Stderr, "\naccess token rejected: %s\n", tokenErr.Message)
		fmt.Fprintln(os.Stderr, "\n\"Unauthorized. Unknown Client\" means DOKU does not recognise DOKU_CLIENT_ID for DOKU_BASE_URL. Check that:")
		fmt.Fprintln(os.Stderr, "  - the credentials come from the same environment as DOKU_BASE_URL (sandbox credentials are not valid on api.doku.com)")
		fmt.Fprintln(os.Stderr, "  - DOKU_CLIENT_ID is the SNAP client id, not the Checkout one")
		fmt.Fprintln(os.Stderr, "  - the public key matching DOKU_PRIVATE_KEY is uploaded under Integration > API Keys in the DOKU Back Office")
		os.Exit(1)
	}

	fmt.Println("\naccess token granted: credentials are valid")
}

// Redacted by default because this output can end up in a public CI log.
func format(value string, show bool) string {
	if show {
		return value
	}
	if len(value) <= 8 {
		return fmt.Sprintf("<redacted, %d chars>", len(value))
	}
	return fmt.Sprintf("%s...%s (%d chars)", value[:4], value[len(value)-4:], len(value))
}
