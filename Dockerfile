FROM bitnami/node AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN yarn install

COPY . .

RUN yarn build

FROM bitnami/node

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY .env .env

EXPOSE 3000
CMD [ "yarn", "start" ]