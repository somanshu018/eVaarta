FROM node:20-alpine
WORKDIR /app
COPY server/ ./server
WORKDIR /app/server
RUN npm install
EXPOSE 8000
CMD ["npm", "start"]
