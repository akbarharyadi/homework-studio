# --- build ---
FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Migrations are embedded via go:embed, so the binaries are self-contained.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/seed ./cmd/seed

# --- runtime ---
FROM alpine:3.20
RUN adduser -D -u 10001 app && mkdir -p /app/storage && chown -R app /app
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/seed /app/seed
USER app
EXPOSE 8080
CMD ["/app/api"]
