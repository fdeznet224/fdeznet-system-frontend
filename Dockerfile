# Panel web de la nube: una sola compilación sirve a todos los ISP porque la
# API siempre se llama por la ruta relativa /api de su propio subdominio.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.nube.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# API_UPSTREAM lo pone docker compose: la API de este mismo ISP.
ENV API_UPSTREAM=api:8000
EXPOSE 80
