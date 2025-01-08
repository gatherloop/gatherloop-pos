FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go

RUN npm install
RUN npx nx run api-contract:generate:go
RUN cd apps/api && go mod download
RUN npx nx run api:build

FROM golang
COPY --from=build /app/dist/apps/api /go/bin/api
ENTRYPOINT ["/go/bin/api"]