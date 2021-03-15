FROM node:15-alpine

WORKDIR /app

COPY . /app/

RUN npm install -g -s --no-progress yarn && \
    yarn 

CMD [ "node", "index.mjs" ]