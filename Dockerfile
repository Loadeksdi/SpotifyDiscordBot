FROM node:6.9.5

WORKDIR /usr/src/app

RUN npm install -g -s --no-progress yarn && \
    yarn && \
    yarn run build && \
    yarn run prune && \
    yarn cache clean

CMD [ "npm", "start" ]