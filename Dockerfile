FROM mhart/alpine-node:6.3.1

COPY . /usr/src/lsd

WORKDIR /usr/src/lsd
RUN npm install

EXPOSE 8080

CMD [ "node", "/usr/src/lsd/server.js" ]
