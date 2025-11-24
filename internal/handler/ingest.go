package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"blackroad-os-beacon/internal/db"
	"blackroad-os-beacon/internal/model"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// Handler binds dependencies for request handlers.
type Handler struct {
	db  *db.DB
	hub *StreamHub
}

// NewHandler configures a Handler instance.
func NewHandler(database *db.DB, hub *StreamHub) *Handler {
	return &Handler{db: database, hub: hub}
}

type ingestRequest struct {
	Env    string `json:"env"`
	Status string `json:"status"`
	Meta   string `json:"meta"`
}

// Ingest accepts ping payloads and persists them.
func (h *Handler) Ingest(c fiber.Ctx) error {
	var req ingestRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid payload")
	}
	if req.Env == "" || req.Status == "" {
		return fiber.NewError(fiber.StatusBadRequest, "env and status required")
	}

	ping := model.Ping{
		ID:     uuid.NewString(),
		Ts:     time.Now().UTC(),
		Env:    req.Env,
		Status: req.Status,
		Meta:   req.Meta,
	}
	bucket := fmt.Sprintf("pings-%s", ping.Ts.Format("2006-01-02"))
	if err := h.db.SavePing(bucket, ping.ID, ping); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	h.hub.Broadcast(ping)
	return c.Status(fiber.StatusAccepted).JSON(ping)
}

// HMACMiddleware is a stub auth guard for write endpoints.
func HMACMiddleware(secret string) fiber.Handler {
	return func(c fiber.Ctx) error {
		if secret == "" || c.Method() == fiber.MethodGet {
			return c.Next()
		}
		sig := c.Get("X-BEACON-SIG")
		expected := computeHMAC(secret, c.Body())
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return c.Next()
		}
		return fiber.ErrUnauthorized
	}
}

func computeHMAC(secret string, body []byte) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(body)
	return hex.EncodeToString(h.Sum(nil))
}
