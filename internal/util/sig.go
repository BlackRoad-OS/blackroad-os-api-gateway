package util

import (
	"encoding/json"
	"os"
	"time"
)

// Signature describes build metadata written to disk.
type Signature struct {
	Timestamp time.Time `json:"ts"`
	Agent     string    `json:"agent"`
}

// WriteSignature writes the signature file used by the UI.
func WriteSignature(path string) error {
	sig := Signature{Timestamp: time.Now().UTC(), Agent: "Beacon-Gen-0"}
	b, err := json.MarshalIndent(sig, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o644)
}
