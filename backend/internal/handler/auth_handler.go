package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/auth"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
	"homework-studio/internal/store"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login verifies credentials and returns a JWT + the user profile.
func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.BadRequest(c, "invalid body")
	}
	u, err := h.store.GetUserByEmail(c.Context(), req.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return httpx.Unauthorized(c, "invalid email or password")
		}
		return httpx.Internal(c, "login failed")
	}
	if !auth.CheckPassword(req.Password, u.PasswordHash) {
		return httpx.Unauthorized(c, "invalid email or password")
	}
	token, err := h.auth.Issue(u.ID, u.Role, u.TenantID)
	if err != nil {
		return httpx.Internal(c, "could not issue token")
	}
	return httpx.OK(c, fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id": u.ID, "name": u.Name, "email": u.Email, "role": u.Role, "tenant_id": u.TenantID,
		},
	})
}

// Me returns the current user's profile.
func (h *Handler) Me(c *fiber.Ctx) error {
	u, err := h.store.GetUser(c.Context(), middleware.UserID(c))
	if err != nil {
		return httpx.Unauthorized(c, "unknown user")
	}
	return httpx.OK(c, fiber.Map{
		"id": u.ID, "name": u.Name, "email": u.Email, "role": u.Role, "tenant_id": u.TenantID,
	})
}
