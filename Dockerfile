FROM node:15-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN rm -rf node_modules && yarn install --frozen-lockfile

COPY . .

CMD [ "node", "index.js"]