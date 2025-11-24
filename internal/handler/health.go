package handler

import "github.com/gofiber/fiber/v3"

// Health responds with liveness.
func Health(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"ok": true})
}
