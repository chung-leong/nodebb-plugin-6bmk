FROM node:lts

RUN mkdir -p /usr/src/app && \
    chown -R node:node /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
USER node

RUN git clone --depth=1 --branch v3.0.0-rc.1 https://github.com/NodeBB/NodeBB.git .

RUN cp ./install/package.json . && \
    npm install --only=prod && \
    npm cache clean --force

RUN npm install nodebb-plugin-6bmk && \
    npm cache clean --force

RUN mkdir ./config && \
    ln -s ./config/config.json ./config.json

ENV NODE_ENV=production \
    daemon=false \
    silent=false

EXPOSE 4567

CMD node ./nodebb build; node ./nodebb start
