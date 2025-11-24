package handler

import (
	"bytes"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"blackroad-os-beacon/internal/db"
	"blackroad-os-beacon/internal/model"

	"github.com/gofiber/fiber/v3"
	"github.com/stretchr/testify/require"
)

func setupTestApp(t *testing.T, database *db.DB, hub *StreamHub, secret string) *fiber.App {
	t.Helper()
	h := NewHandler(database, hub)
	app := fiber.New()
	app.Use(HMACMiddleware(secret))
	app.Post("/ping", h.Ingest)
	return app
}

func TestIngestStoresPingAndBroadcasts(t *testing.T) {
	dbPath := t.TempDir() + "/beacon.db"
	database, err := db.Open(dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { database.Close() })

	hub := NewStreamHub()
	go hub.Run()

	app := setupTestApp(t, database, hub, "")

	client := make(chan model.Ping, 1)
	hub.register <- client
	req := httptest.NewRequest("POST", "/ping", strings.NewReader(`{"env":"core","status":"ok"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusAccepted, resp.StatusCode)

	bucket := "pings-" + time.Now().UTC().Format("2006-01-02")
	count := 0
	err = database.IteratePings(bucket, func(v []byte) error {
		count++
		return nil
	})
	require.NoError(t, err)
	require.Equal(t, 1, count)

	select {
	case ping := <-client:
		require.Equal(t, "core", ping.Env)
	case <-time.After(time.Second):
		t.Fatal("expected broadcast")
	}
}

func TestHMACMiddleware(t *testing.T) {
	dbPath := t.TempDir() + "/beacon.db"
	database, err := db.Open(dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { database.Close() })

	hub := NewStreamHub()
	go hub.Run()
	app := setupTestApp(t, database, hub, "secret")

	body := []byte(`{"env":"core","status":"ok"}`)
	badReq := httptest.NewRequest("POST", "/ping", bytes.NewReader(body))
	badReq.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(badReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	goodReq := httptest.NewRequest("POST", "/ping", bytes.NewReader(body))
	goodReq.Header.Set("Content-Type", "application/json")
	goodReq.Header.Set("X-BEACON-SIG", computeHMAC("secret", body))

	resp, err = app.Test(goodReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusAccepted, resp.StatusCode)
}
