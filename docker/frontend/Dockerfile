FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist /usr/share/nginx/html
# nginx.conf est monté au runtime par docker-compose (volumes), pas copié ici,
# car le contexte de build de ce Dockerfile est le repo cloné (./repo/frontend),
# qui ne contient pas ce fichier.
# Image "nginx-unprivileged" : tourne en non-root, écoute sur le port 8080 par défaut.

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
