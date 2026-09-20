// Package handler holds the Fiber HTTP handlers, grouped by resource.
package handler

import (
	"homework-studio/internal/auth"
	"homework-studio/internal/config"
	"homework-studio/internal/pipeline"
	"homework-studio/internal/store"
	"homework-studio/internal/tutor"
)

// Handler bundles every dependency the routes need.
type Handler struct {
	cfg      *config.Config
	store    *store.Store
	auth     *auth.Manager
	pipeline *pipeline.Pipeline
	tutor    *tutor.Service
}

func New(
	cfg *config.Config,
	s *store.Store,
	authMgr *auth.Manager,
	pl *pipeline.Pipeline,
	tut *tutor.Service,
) *Handler {
	return &Handler{cfg: cfg, store: s, auth: authMgr, pipeline: pl, tutor: tut}
}
