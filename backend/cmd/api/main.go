// Command api is the Homework Studio HTTP server.
//
// Wiring: config -> pgx pool + migrate -> store -> (auth, AI clients, vision,
// pipeline, tutor) -> Fiber app + routes. AI runs on the mock provider unless a
// key is set; classification uses jev/TypeAI when CLASSIFIER_PROVIDER != mock.
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"homework-studio/internal/ai"
	"homework-studio/internal/auth"
	"homework-studio/internal/config"
	"homework-studio/internal/db"
	"homework-studio/internal/handler"
	"homework-studio/internal/pipeline"
	"homework-studio/internal/router"
	"homework-studio/internal/store"
	"homework-studio/internal/tutor"
	"homework-studio/internal/vision"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	st := store.New(pool)
	authMgr := auth.New(cfg.SecretKey, cfg.TokenTTLMin)

	// Primary AI (extraction fallback + tutor) and the jev/TypeAI classifier.
	aiClient := ai.New(cfg.AIBaseURL, cfg.AIKey, cfg.AIModel)
	classifierClient := ai.New(cfg.ClassifierBaseURL, cfg.ClassifierKey, cfg.ClassifierModel)

	extractor := vision.MockExtractor{} // free, deterministic; real provider swaps here
	classifier := vision.NewClassifier(cfg.ClassifierProvider, classifierClient)
	log.Printf("AI: provider=%s (enabled=%v) classifier=%s",
		cfg.AIProvider, aiClient.Enabled(), classifier.Name())

	pl := pipeline.New(st, extractor, classifier, cfg.ReviewThreshold, cfg.StorageDir)
	tut := tutor.New(aiClient, st)
	h := handler.New(cfg, st, authMgr, pl, tut)

	app := fiber.New(fiber.Config{
		AppName:               cfg.AppName,
		BodyLimit:             25 * 1024 * 1024, // 25MB uploads
		DisableStartupMessage: true,
	})
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.FrontendOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
	}))

	router.Setup(app, h, authMgr)

	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("listen: %v", err)
		}
	}()
	log.Printf("%s listening on :%s", cfg.AppName, cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down…")
	_ = app.Shutdown()
}
