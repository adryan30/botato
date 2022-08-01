FROM bitnami/node

# Legacy Alpine code
# RUN apk update && apk add python make g++ ffmpeg

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .

CMD ["npm", "run", "start:dev"]