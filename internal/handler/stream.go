package handler

import (
	"bufio"
	"context"
	"encoding/json"
	"log"
	"time"

	"blackroad-os-beacon/internal/model"

	"github.com/gofiber/fiber/v3"
)

// StreamHub manages SSE clients.
type StreamHub struct {
	clients    map[chan model.Ping]struct{}
	register   chan chan model.Ping
	unregister chan chan model.Ping
	broadcast  chan model.Ping
}

// NewStreamHub constructs a hub.
func NewStreamHub() *StreamHub {
	return &StreamHub{
		clients:    make(map[chan model.Ping]struct{}),
		register:   make(chan chan model.Ping),
		unregister: make(chan chan model.Ping),
		broadcast:  make(chan model.Ping, 8),
	}
}

// Run processes registration and broadcasts.
func (h *StreamHub) Run(ctx context.Context) {
	defer h.shutdown()
	for {
		select {
		case <-ctx.Done():
			return
		case client := <-h.register:
			h.clients[client] = struct{}{}
		case client := <-h.unregister:
			delete(h.clients, client)
			close(client)
		case msg := <-h.broadcast:
			for client := range h.clients {
				select {
				case client <- msg:
				default:
					// TODO(beacon-next): backpressure and metrics fan-out
				}
			}
		}
	}
}

// shutdown closes all client channels when the hub stops.
func (h *StreamHub) shutdown() {
	for client := range h.clients {
		close(client)
	}
	h.clients = make(map[chan model.Ping]struct{})
}

// Broadcast sends message to all subscribers.
func (h *StreamHub) Broadcast(p model.Ping) {
	select {
	case h.broadcast <- p:
	default:
		log.Printf("warn: dropping broadcast ping %s", p.ID)
	}
}

// Stream streams saved and live pings to clients via SSE.
func (h *Handler) Stream(c fiber.Ctx) error {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	// TODO(beacon-next): optional WebSocket upgrade for richer clients.

	client := make(chan model.Ping, 16)
	h.hub.register <- client
	defer func() {
		h.hub.unregister <- client
	}()

	bucket := "pings-" + time.Now().UTC().Format("2006-01-02")
	_ = h.db.IteratePings(bucket, func(v []byte) error {
		var ping model.Ping
		if err := json.Unmarshal(v, &ping); err != nil {
			return nil
		}
		select {
		case client <- ping:
		default:
		}
		return nil
	})

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		for {
			select {
			case <-c.Context().Done():
				return
			case ping := <-client:
				b, err := json.Marshal(ping)
				if err != nil {
					log.Printf("error: failed to marshal ping (ID: %s): %v", ping.ID, err)
					continue
				}
				w.WriteString("data: ")
				w.Write(b)
				w.WriteString("\n\n")
				w.Flush()
			}
		}
	})

	return nil
}
