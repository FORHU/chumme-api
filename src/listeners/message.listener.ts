import { rabbitMQService, MessageHandler } from "../utils/rabbitmq";
import amqp from "amqplib";

// Define your event types
export interface BaseEvent {
    id: string;
    timestamp: number;
    type: string;
    source: string;
    data: any;
}

export interface UserCreatedEvent extends BaseEvent {
    type: "user.created";
    data: {
        userId: string;
        email: string;
        name?: string;
    };
}

export interface PostCreatedEvent extends BaseEvent {
    type: "post.created";
    data: {
        postId: string;
        userId: string;
        title: string;
        content: string;
    };
}

export interface RoomCreatedEvent extends BaseEvent {
    type: "room.created";
    data: {
        roomId: string;
        creatorId: string;
        name: string;
    };
}

export interface NotificationEvent extends BaseEvent {
    type: "notification.send";
    data: {
        userId: string;
        title: string;
        message: string;
        type: "email" | "push" | "sms";
    };
}

// Event handlers
export class EventHandlers {
    static async handleUserCreated(
        message: UserCreatedEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        console.log("Processing user created event:", message);

        try {
            // Add your business logic here
            // For example: send welcome email, create user profile, etc.
            const { userId, email, name } = message.data;

            // Example: Trigger welcome email
            console.log(`Sending welcome email to user ${userId} at ${email}`);

            // Example: Initialize user settings
            console.log(`Initializing default settings for user ${userId}`);

            // You can call your services here
            // await userService.initializeUserProfile(userId);
            // await emailService.sendWelcomeEmail(email, name);
        } catch (error) {
            console.error("Error handling user created event:", error);
            throw error;
        }
    }

    static async handlePostCreated(
        message: PostCreatedEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        console.log("Processing post created event:", message);

        try {
            const { postId, userId, title } = message.data;

            // Example: Notify followers about new post
            console.log(
                `Notifying followers about new post ${postId} by user ${userId}`
            );

            // Example: Update user activity metrics
            console.log(`Updating activity metrics for user ${userId}`);

            // You can call your services here
            // await notificationService.notifyFollowers(userId, postId);
            // await analyticsService.trackPostCreation(userId, postId);
        } catch (error) {
            console.error("Error handling post created event:", error);
            throw error;
        }
    }

    static async handleRoomCreated(
        message: RoomCreatedEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        console.log("Processing room created event:", message);

        try {
            const { roomId, creatorId, name } = message.data;

            // Example: Set up room permissions
            console.log(`Setting up permissions for room ${roomId}`);

            // Example: Initialize room settings
            console.log(`Initializing default settings for room ${roomId}`);

            // You can call your services here
            // await roomService.setupRoomPermissions(roomId, creatorId);
            // await roomService.initializeRoomSettings(roomId);
        } catch (error) {
            console.error("Error handling room created event:", error);
            throw error;
        }
    }

    static async handleNotification(
        message: NotificationEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        console.log("Processing notification event:", message);

        try {
            const {
                userId,
                title,
                message: notificationMessage,
                type,
            } = message.data;

            switch (type) {
                case "email":
                    console.log(
                        `Sending email notification to user ${userId}: ${title}`
                    );
                    // await emailService.sendNotification(userId, title, notificationMessage);
                    break;
                case "push":
                    console.log(
                        `Sending push notification to user ${userId}: ${title}`
                    );
                    // await pushService.sendNotification(userId, title, notificationMessage);
                    break;
                case "sms":
                    console.log(
                        `Sending SMS notification to user ${userId}: ${title}`
                    );
                    // await smsService.sendNotification(userId, title, notificationMessage);
                    break;
                default:
                    console.log(`Unknown notification type: ${type}`);
            }
        } catch (error) {
            console.error("Error handling notification event:", error);
            throw error;
        }
    }

    // Generic handler for unrecognized events
    static async handleGenericEvent(
        message: BaseEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        console.log("Processing generic event:", message);

        try {
            // Log the event for monitoring
            console.log(
                `Received event of type: ${message.type} from source: ${message.source}`
            );

            // You can add generic processing logic here
            // For example: save to audit log, update metrics, etc.
        } catch (error) {
            console.error("Error handling generic event:", error);
            throw error;
        }
    }
}

// Event router to route messages to appropriate handlers
export class EventRouter {
    private handlers: Map<string, MessageHandler> = new Map();

    constructor() {
        this.setupHandlers();
    }

    private setupHandlers(): void {
        this.handlers.set("user.created", EventHandlers.handleUserCreated);
        this.handlers.set("post.created", EventHandlers.handlePostCreated);
        this.handlers.set("room.created", EventHandlers.handleRoomCreated);
        this.handlers.set(
            "notification.send",
            EventHandlers.handleNotification
        );
    }

    async routeMessage(
        message: BaseEvent,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        const handler = this.handlers.get(message.type);

        if (handler) {
            await handler(message, originalMsg);
        } else {
            // Handle unknown event types with generic handler
            await EventHandlers.handleGenericEvent(message, originalMsg);
        }
    }

    addHandler(eventType: string, handler: MessageHandler): void {
        this.handlers.set(eventType, handler);
    }

    removeHandler(eventType: string): void {
        this.handlers.delete(eventType);
    }
}

export const eventRouter = new EventRouter();

// Message listener setup
export class MessageListener {
    private eventRouter: EventRouter;

    constructor(eventRouter: EventRouter) {
        this.eventRouter = eventRouter;
    }

    async startListening(): Promise<void> {
        try {
            // Subscribe to different types of events
            await rabbitMQService.subscribeToMessages(
                "chumme.user.events",
                ["user.*"], // Listen to all user-related events
                this.handleMessage.bind(this)
            );

            await rabbitMQService.subscribeToMessages(
                "chumme.post.events",
                ["post.*"], // Listen to all post-related events
                this.handleMessage.bind(this)
            );

            await rabbitMQService.subscribeToMessages(
                "chumme.room.events",
                ["room.*"], // Listen to all room-related events
                this.handleMessage.bind(this)
            );

            await rabbitMQService.subscribeToMessages(
                "chumme.notification.events",
                ["notification.*"], // Listen to all notification events
                this.handleMessage.bind(this)
            );

            // Listen to all events (catch-all)
            await rabbitMQService.subscribeToMessages(
                "chumme.all.events",
                ["#"], // Listen to all events
                this.handleMessage.bind(this)
            );

            console.log("Message listener started successfully");
        } catch (error) {
            console.error("Error starting message listener:", error);
            throw error;
        }
    }

    private async handleMessage(
        message: any,
        originalMsg: amqp.ConsumeMessage
    ): Promise<void> {
        try {
            // Validate message structure
            if (!message.type || !message.id || !message.timestamp) {
                throw new Error("Invalid message structure");
            }

            await this.eventRouter.routeMessage(message, originalMsg);
        } catch (error) {
            console.error("Error in message handler:", error);
            throw error;
        }
    }
}

export const messageListener = new MessageListener(eventRouter);
