package handler

import "github.com/gofiber/fiber/v3"

const version = "0.0.1"

// Version returns semantic version.
func Version(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"version": version})
}
