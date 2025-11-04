# RabbitMQ Integration Documentation

## Overview

This project now includes RabbitMQ integration for event-driven architecture. The system can both listen to events from other microservices and publish events for other services to consume.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Microservice  │────▶│    RabbitMQ     │────▶│   Chumme API    │
│      A          │     │    Exchange     │     │   (Listener)    │
└─────────────────┘     │   (Topic)       │     └─────────────────┘
                        │                 │
┌─────────────────┐     │                 │     ┌─────────────────┐
│   Chumme API    │────▶│                 │────▶│  Microservice   │
│  (Publisher)    │     │                 │     │       B         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Setup

### 1. Install RabbitMQ Server

#### Local Development (Docker)

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

#### Local Development (Direct Install)

-   **Windows**: Download from https://www.rabbitmq.com/install-windows.html
-   **macOS**: `brew install rabbitmq`
-   **Linux**: `apt-get install rabbitmq-server`

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=chumme_exchange
RABBITMQ_QUEUE_PREFIX=chumme
```

### 3. Start Your Application

```bash
npm run dev
```

The application will automatically:

-   Connect to RabbitMQ
-   Set up the exchange and queues
-   Start listening for events

## Event Types

The system supports the following event types:

### User Events

-   `user.created` - When a new user registers
-   `user.updated` - When user profile is updated
-   `user.deleted` - When a user is deleted

### Post Events

-   `post.created` - When a new post is created
-   `post.updated` - When a post is modified
-   `post.deleted` - When a post is removed

### Room Events

-   `room.created` - When a new room is created
-   `room.updated` - When room details are modified
-   `room.deleted` - When a room is removed
-   `room.user.joined` - When a user joins a room
-   `room.user.left` - When a user leaves a room

### Notification Events

-   `notification.send` - For sending notifications (email, push, SMS)

### Chat Events

-   `chat.message.sent` - When a message is sent
-   `chat.message.updated` - When a message is edited
-   `chat.message.deleted` - When a message is deleted

### File Events

-   `file.uploaded` - When a file is uploaded
-   `file.deleted` - When a file is removed

## Publishing Events

### From Your Services

```typescript
import { EventPublisher } from "../services/event-publisher.service";

// Example: Publishing a user created event
await EventPublisher.publishUserCreated({
    userId: "user123",
    email: "user@example.com",
    name: "John Doe",
});

// Example: Publishing a post created event
await EventPublisher.publishPostCreated({
    postId: "post123",
    userId: "user123",
    title: "My First Post",
    content: "Hello World!",
});

// Example: Custom event
await EventPublisher.publishCustomEvent(
    "custom.event.type",
    { customData: "value" },
    "custom.routing.key"
);
```

### Event Structure

All events follow this structure:

```typescript
interface BaseEvent {
    id: string; // Unique event ID
    timestamp: number; // Unix timestamp
    type: string; // Event type (e.g., "user.created")
    source: string; // Source service (default: "chumme-api")
    data: any; // Event-specific data
}
```

## Listening to Events

### Adding Custom Event Handlers

1. **Add handler to EventHandlers class**:

```typescript
// src/listeners/message.listener.ts
static async handleCustomEvent(message: BaseEvent, originalMsg: ConsumeMessage): Promise<void> {
  console.log('Processing custom event:', message);

  try {
    // Your business logic here
    const { customData } = message.data;

    // Process the event
    console.log('Processing custom data:', customData);

  } catch (error) {
    console.error('Error handling custom event:', error);
    throw error;
  }
}
```

2. **Register the handler**:

```typescript
// In EventRouter constructor
this.handlers.set("custom.event.type", EventHandlers.handleCustomEvent);
```

3. **Add queue subscription**:

```typescript
// In MessageListener.startListening()
await rabbitMQService.subscribeToMessages(
    `${RABBITMQ_QUEUE_PREFIX}.custom.events`,
    ["custom.*"],
    this.handleMessage.bind(this)
);
```

### Current Event Handlers

The system includes handlers for:

-   **User Events**: Welcome emails, profile initialization
-   **Post Events**: Follower notifications, activity tracking
-   **Room Events**: Permission setup, room initialization
-   **Notification Events**: Email, push, SMS routing
-   **Generic Events**: Logging and monitoring

## Queues and Routing

### Queue Structure

```
Exchange: chumme_exchange (topic)
├── chumme.user.events (routing: user.*)
├── chumme.post.events (routing: post.*)
├── chumme.room.events (routing: room.*)
├── chumme.notification.events (routing: notification.*)
└── chumme.all.events (routing: #)
```

### Routing Keys

-   `user.*` - All user-related events
-   `post.*` - All post-related events
-   `room.*` - All room-related events
-   `notification.*` - All notification events
-   `#` - All events (catch-all)

## Error Handling

### Message Processing Errors

If a message handler throws an error:

1. The error is logged
2. The message is rejected (nacked)
3. The message is NOT requeued (to prevent infinite loops)

### Connection Errors

If RabbitMQ connection fails:

1. The system attempts to reconnect every 5 seconds
2. The application continues running
3. Events will be lost during disconnection

### Publishing Errors

If event publishing fails:

1. The error is logged
2. The main operation continues
3. The system doesn't crash

## Monitoring

### Health Checks

Check RabbitMQ status:

```bash
# General health check
GET /api/v1/health

# RabbitMQ specific health check
GET /api/v1/health/rabbitmq
```

Response:

```json
{
    "service": "rabbitmq",
    "status": "healthy", // or "unhealthy"
    "timestamp": "2025-11-03T10:30:00.000Z"
}
```

### Management UI

Access RabbitMQ Management UI at: http://localhost:15672

-   Username: `guest`
-   Password: `guest`

## Example Integration

### Scenario: User Registration Flow

1. **User registers** → Auth service creates user
2. **Event published** → `user.created` event sent to RabbitMQ
3. **Other services listen** → Welcome email, analytics, etc.
4. **Event processed** → Each service handles the event independently

```typescript
// In auth.service.ts (already integrated)
const user = await AuthRepo.createUser(userData);

// Publish event for other microservices
await EventPublisher.publishUserCreated({
    userId: user.id,
    email: user.email,
    name: user.name,
});
```

### Scenario: External Service Triggers Event

1. **External service** → Publishes `notification.send` event
2. **Chumme API listens** → Receives the event
3. **Handler processes** → Sends email/push notification
4. **Response** → Acknowledgment sent back

## Best Practices

### Event Publishing

-   Always wrap in try-catch
-   Don't fail main operation if event publishing fails
-   Use meaningful event types and routing keys
-   Include all necessary data in event payload

### Event Handling

-   Keep handlers idempotent (safe to run multiple times)
-   Log all event processing
-   Handle errors gracefully
-   Don't perform heavy operations synchronously

### Development

-   Use descriptive queue names
-   Test event handling separately
-   Monitor queue sizes and message rates
-   Set up dead letter queues for production

## Troubleshooting

### Common Issues

1. **Connection Failed**

    - Check if RabbitMQ is running
    - Verify connection URL in .env
    - Check firewall/network settings

2. **Messages Not Being Processed**

    - Check queue bindings
    - Verify routing keys
    - Check for handler errors in logs

3. **High Memory Usage**
    - Monitor queue sizes
    - Check for unprocessed messages
    - Verify message acknowledgments

### Debug Commands

```bash
# Check RabbitMQ status
docker ps | grep rabbitmq

# View logs
docker logs rabbitmq

# Access RabbitMQ shell
docker exec -it rabbitmq rabbitmqctl list_queues
```

## Production Considerations

1. **Use connection pooling**
2. **Set up dead letter queues**
3. **Configure proper acknowledgment timeouts**
4. **Monitor queue sizes and processing rates**
5. **Use RabbitMQ clustering for high availability**
6. **Set up proper authentication and SSL/TLS**
7. **Configure message TTL and queue limits**

---

For more information, refer to:

-   [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
-   [AMQP Node.js Client](https://github.com/squaremo/amqp.node)
