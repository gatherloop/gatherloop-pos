package main

import (
	"fmt"
	"os"

	webpushgo "github.com/SherClockHolmes/webpush-go"
)

func main() {
	privateKey, publicKey, err := webpushgo.GenerateVAPIDKeys()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("WEB_PUSH_VAPID_PUBLIC_KEY=%s\n", publicKey)
	fmt.Printf("WEB_PUSH_VAPID_PRIVATE_KEY=%s\n", privateKey)
}
