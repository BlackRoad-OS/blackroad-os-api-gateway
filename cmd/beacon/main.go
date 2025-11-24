package main

import (
	log "log"
	"os"
	"time"

	"blackroad-os-beacon/config"
	"blackroad-os-beacon/internal/db"
	"blackroad-os-beacon/internal/handler"
	"blackroad-os-beacon/internal/util"

	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.LoadEnv()
	if err := util.WriteSignature("./public/sig_beacon.json"); err != nil {
		log.Fatalf("write signature: %v", err)
	}

	database, err := db.Open(cfg.BoltPath)
	if err != nil {
		log.Fatalf("open bolt db: %v", err)
	}
	defer database.Close()

	hub := handler.NewStreamHub()
	go hub.Run()

	app := fiber.New(fiber.Config{AppName: "blackroad-os-beacon"})

	app.Use(handler.HMACMiddleware(cfg.HMACSecret))

	h := handler.NewHandler(database, hub)
	app.Get("/health", handler.Health)
	app.Get("/version", handler.Version)
	app.Post("/ping", h.Ingest)
	app.Get("/stream", h.Stream)

	addr := ":" + cfg.Port
	if envPort := os.Getenv("PORT"); envPort != "" {
		addr = ":" + envPort
	}

	time.AfterFunc(0, func() {
		log.Printf("beacon listening on %s", addr)
	})

	if err := app.Listen(addr); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
