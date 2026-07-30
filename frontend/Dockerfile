FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

ARG VITE_API_URL
ARG VITE_SERVER_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build

FROM nginx:alpine

COPY --from=0 /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]