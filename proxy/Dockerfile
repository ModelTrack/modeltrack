FROM golang:1.22-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /costtrack-proxy .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 1000 costtrack

COPY --from=builder /costtrack-proxy /usr/local/bin/costtrack-proxy

USER costtrack

EXPOSE 8080

ENTRYPOINT ["costtrack-proxy"]
