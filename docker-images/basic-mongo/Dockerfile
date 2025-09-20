FROM --platform=amd64 node:18-alpine
WORKDIR /app
RUN npm config set strict-ssl false
COPY package.json ./
RUN npm install
COPY . .
CMD ["npx","ts-node", "index.ts"]