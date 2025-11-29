package model

import "time"

// Ping represents a health signal from a subsystem.
type Ping struct {
	ID     string    `json:"id"`
	Ts     time.Time `json:"ts"`
	Env    string    `json:"env"`
	Status string    `json:"status"`
	Meta   string    `json:"meta,omitempty"`
}
