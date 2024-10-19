FROM node:20

RUN npm i -g typescript

RUN npm i -g node-pg-migrate

RUN npm i -g nodemon

WORKDIR /app

COPY ./package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm","run","dev"]

