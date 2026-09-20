// Package middleware provides Fiber middleware: JWT auth and role guards.
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/auth"
	"homework-studio/internal/httpx"
)

// Context keys stored on the Fiber locals after authentication.
const (
	KeyUserID   = "userID"
	KeyRole     = "role"
	KeyTenantID = "tenantID"
)

// RequireAuth verifies the Bearer token and stashes the claims on the context.
func RequireAuth(mgr *auth.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			return httpx.Unauthorized(c, "missing bearer token")
		}
		claims, err := mgr.Verify(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			return httpx.Unauthorized(c, "invalid or expired token")
		}
		c.Locals(KeyUserID, claims.UserID)
		c.Locals(KeyRole, claims.Role)
		c.Locals(KeyTenantID, claims.TenantID)
		return c.Next()
	}
}

// RequireRole rejects the request unless the caller holds one of the roles.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals(KeyRole).(string)
		if _, ok := allowed[role]; !ok {
			return httpx.Forbidden(c, "insufficient role")
		}
		return c.Next()
	}
}

// Helpers to read auth context from a handler.
func UserID(c *fiber.Ctx) string   { v, _ := c.Locals(KeyUserID).(string); return v }
func Role(c *fiber.Ctx) string     { v, _ := c.Locals(KeyRole).(string); return v }
func TenantID(c *fiber.Ctx) string { v, _ := c.Locals(KeyTenantID).(string); return v }
