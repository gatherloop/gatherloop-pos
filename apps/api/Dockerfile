FROM node:22-alpine AS build
COPY . .
RUN apk add openjdk21-jre go

RUN npm install
RUN npx nx run api:build

FROM golang
COPY --from=build /apps/api/dist/api /api
CMD ["/api"]