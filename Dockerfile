FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o beacon ./cmd/beacon

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/beacon /usr/local/bin/beacon
COPY --from=builder /app/public ./public
COPY beacon.env.example .
EXPOSE 5000
ENV PORT=5000
CMD ["beacon"]
