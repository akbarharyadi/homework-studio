// Package httpx holds small HTTP helpers: a consistent JSON envelope and errors.
package httpx

import "github.com/gofiber/fiber/v2"

// OK writes 200 with {"data": ...}.
func OK(c *fiber.Ctx, data any) error {
	return c.JSON(fiber.Map{"data": data})
}

// Created writes 201 with {"data": ...}.
func Created(c *fiber.Ctx, data any) error {
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": data})
}

// Fail writes an error envelope {"error": {"message": ...}} with the given status.
func Fail(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{"error": fiber.Map{"message": msg}})
}

// BadRequest, Unauthorized, Forbidden, NotFound, Internal are convenience wrappers.
func BadRequest(c *fiber.Ctx, msg string) error  { return Fail(c, fiber.StatusBadRequest, msg) }
func Unauthorized(c *fiber.Ctx, msg string) error { return Fail(c, fiber.StatusUnauthorized, msg) }
func Forbidden(c *fiber.Ctx, msg string) error    { return Fail(c, fiber.StatusForbidden, msg) }
func NotFound(c *fiber.Ctx, msg string) error     { return Fail(c, fiber.StatusNotFound, msg) }
func Internal(c *fiber.Ctx, msg string) error     { return Fail(c, fiber.StatusInternalServerError, msg) }
