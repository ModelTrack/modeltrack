FROM golang:1.22-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /modeltrack-collector .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 1000 modeltrack

COPY --from=builder /modeltrack-collector /usr/local/bin/modeltrack-collector

USER modeltrack

ENTRYPOINT ["modeltrack-collector"]
