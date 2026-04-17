FROM node:25

WORKDIR /app

COPY --chown=node:node . .

RUN npm install

CMD ["node", "src/index.js", "--x=44", "--y=77", "--app=snake"]
