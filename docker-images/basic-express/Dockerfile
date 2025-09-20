FROM --platform=linux/amd64 node:18-alpine 
WORKDIR app
COPY package.json . 
RUN npm config set strict-ssl false
RUN npm install
COPY . .
RUN npm run build
CMD ["npm","run","start"]