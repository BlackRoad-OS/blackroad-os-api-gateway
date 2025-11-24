package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

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

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	hub := handler.NewStreamHub()
	go hub.Run(ctx)

	app := fiber.New(fiber.Config{AppName: "blackroad-os-beacon"})

	app.Use(handler.HMACMiddleware(cfg.HMACSecret))

	h := handler.NewHandler(database, hub)
	app.Get("/health", handler.Health)
	app.Get("/version", handler.Version)
	app.Post("/ping", h.Ingest)
	app.Get("/stream", h.Stream)

	addr := ":" + cfg.Port

	log.Printf("beacon listening on %s", addr)

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("shutting down gracefully...")
		cancel() // Cancel the context to stop the hub
		if err := app.Shutdown(); err != nil {
			log.Printf("error during shutdown: %v", err)
		}
		os.Exit(0)
	}()

	if err := app.Listen(addr); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
