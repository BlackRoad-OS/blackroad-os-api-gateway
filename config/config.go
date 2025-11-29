package config

import (
	"log"
	"os"
)

// Config holds environment-backed settings.
type Config struct {
	Port       string
	BoltPath   string
	HMACSecret string
}

// LoadEnv reads environment variables with fallbacks for local dev.
func LoadEnv() Config {
	cfg := Config{
		Port:       getenv("PORT", "5000"),
		BoltPath:   getenv("BOLT_PATH", "./data/beacon.db"),
		HMACSecret: os.Getenv("HMAC_SECRET"),
	}

	if err := os.MkdirAll("./data", 0o755); err != nil {
		log.Printf("warn: unable to ensure data dir: %v", err)
	}

	return cfg
}

func getenv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
