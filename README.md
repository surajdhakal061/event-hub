# EventHub - Start Guide

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Set values in `.env` for:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `KAFKA_ENABLED`
- `KAFKA_BROKERS`
- `KAFKA_CLIENT_ID`
- `KAFKA_GROUP_ID`
- `KAFKA_TOPIC`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## 3. Generate Prisma client

```bash
npm run prisma:generate
```

## 4. Run database migration

```bash
npx prisma migrate dev --name init
```

## 5. Start Kafka and Zookeeper (Docker)

```bash
docker-compose  up -d
```

## 6. Start the application

```bash
npm run start:dev
```

## 7. Open API docs

- `http://localhost:3000/docs`
