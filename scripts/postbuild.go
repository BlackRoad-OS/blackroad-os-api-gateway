package main

import (
	"log"

	"blackroad-os-beacon/internal/util"
)

func main() {
	if err := util.WriteSignature("./public/sig_beacon.json"); err != nil {
		log.Fatalf("write signature: %v", err)
	}
}
