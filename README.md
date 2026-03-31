# EventHub - Event Streaming & Management Platform

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

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

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Run database migration

```bash
npm run prisma:migrate -- --name init
```

### 5. Start Kafka and Zookeeper (Docker)

```bash
docker-compose up -d
```

### 6. Start the application

```bash
npm run start:dev
```

## API Testing with Postman

### Import the Postman Collection

1. **Download Postman** - Install [Postman](https://www.postman.com/downloads/) if not already installed
2. **Import Collection** - Open Postman and use one of these methods:
   - **Method A (File Import)**:
     - Click `File` → `Import`
     - Select `EventHub.postman_collection.json` from the project root
   - **Method B (Workspace Import)**:
     - Click `File` → `Import` → `Link`
     - Paste the file path or drag-drop the JSON file

3. **Configure Environment Variables**:
   - The collection uses Postman variables automatically set during requests
   - Key variables:
     - `baseUrl` - Default: `http://localhost:3000`
     - `email` - Test user email
     - `password` - Test user password
     - `jwt` - Auto-populated after login
     - `appId` - Auto-populated after creating an app
     - `apiKey` - Auto-populated after generating an API key
     - `eventName` - Event type to publish/subscribe
     - `webhookUrl` - Optional webhook URL for subscriptions

### Testing Workflow

**Recommended request execution order:**

1. **Auth > Register** - Create a test user (auto-saves JWT token)
2. **Apps > Create App** - Create first app as publisher (auto-saves appId)
3. **Apps > Create App** - Create second app as subscriber (update appId in subsequent requests)
4. **Subscriptions > Create Subscription** - Subscribe second app to event types
5. **Apps > Generate API Key** - Get API key for publishing (use first app)
6. **Templates > Create Template** - Create email template for publishing
7. **Events > Publish Event** - Publish event using API key (subscribers notified)
8. **Events > List Events** - View published events
9. **Subscriptions > List Subscriptions** - View active subscriptions
10. **Deliveries > List Deliveries** - Track delivery status
11. **Analytics > Overview** - View event statistics

### Key Features Demonstrated

- ✅ **Multi-tenant Apps** - Each user can create multiple apps
- ✅ **Event Publishing** - Publish events via API key authentication
- ✅ **Event Subscriptions** - Apps can subscribe to event types
- ✅ **Template-based Delivery** - Use templates for email content
- ✅ **Event Processing** - Async processing via Kafka
- ✅ **Delivery Tracking** - Monitor delivery success/failure
- ✅ **Analytics** - Track event statistics per app

## Architecture

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Message Queue**: Apache Kafka
- **Authentication**: JWT tokens + API keys
- **Email Service**: Nodemailer (SMTP)

## Project Structure

```
src/
├── auth/              # User authentication & JWT
├── apps/              # Multi-tenant app management
├── subscriptions/     # Event subscription system
├── events/            # Event publishing & processing
├── templates/         # Email templates
├── deliveries/        # Delivery tracking
├── analytics/         # Event analytics
├── common/            # Guards & decorators
└── prisma/            # Database layer
```

## Database Models

- **User** - User accounts with email/password
- **App** - Multi-tenant applications
- **ApiKey** - API key authentication per app
- **Template** - Email templates for delivery
- **Event** - Published events with status tracking
- **EventSubscription** - App subscriptions to event types
- **DeliveryLog** - Event delivery tracking

## Environment Setup

Example `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/eventhub
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=eventhub-api
KAFKA_GROUP_ID=eventhub-worker-group
KAFKA_TOPIC=eventhub-events
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@eventhub.com
```

## Development Commands

```bash
npm run start:dev      # Run in watch mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run test           # Run tests
npm run test:e2e       # Run end-to-end tests
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate # Run database migrations
npm run prisma:studio  # Open Prisma Studio
```

## License

UNLICENSED

## 7. Open API docs

- `http://localhost:3000/docs`
