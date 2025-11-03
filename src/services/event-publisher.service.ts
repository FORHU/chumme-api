import { rabbitMQService } from "../utils/rabbitmq";
import {
    BaseEvent,
    UserCreatedEvent,
    PostCreatedEvent,
    RoomCreatedEvent,
    NotificationEvent,
} from "../listeners/message.listener";

export class EventPublisher {
    private static generateEventId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private static createBaseEvent<T extends string>(
        type: T,
        source: string = "chumme-api"
    ): { id: string; timestamp: number; type: T; source: string } {
        return {
            id: this.generateEventId(),
            timestamp: Date.now(),
            type,
            source,
        };
    }

    // User Events
    static async publishUserCreated(userData: {
        userId: string;
        email: string;
        name?: string;
    }): Promise<void> {
        const event: UserCreatedEvent = {
            ...this.createBaseEvent("user.created"),
            data: userData,
        };

        await rabbitMQService.publishMessage("user.created", event);
    }

    static async publishUserUpdated(userData: {
        userId: string;
        email?: string;
        name?: string;
        updatedFields: string[];
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("user.updated"),
            data: userData,
        };

        await rabbitMQService.publishMessage("user.updated", event);
    }

    static async publishUserDeleted(userData: {
        userId: string;
        email: string;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("user.deleted"),
            data: userData,
        };

        await rabbitMQService.publishMessage("user.deleted", event);
    }

    // Post Events
    static async publishPostCreated(postData: {
        postId: string;
        userId: string;
        title: string;
        content: string;
    }): Promise<void> {
        const event: PostCreatedEvent = {
            ...this.createBaseEvent("post.created"),
            data: postData,
        };

        await rabbitMQService.publishMessage("post.created", event);
    }

    static async publishPostUpdated(postData: {
        postId: string;
        userId: string;
        title?: string;
        content?: string;
        updatedFields: string[];
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("post.updated"),
            data: postData,
        };

        await rabbitMQService.publishMessage("post.updated", event);
    }

    static async publishPostDeleted(postData: {
        postId: string;
        userId: string;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("post.deleted"),
            data: postData,
        };

        await rabbitMQService.publishMessage("post.deleted", event);
    }

    // Room Events
    static async publishRoomCreated(roomData: {
        roomId: string;
        creatorId: string;
        name: string;
    }): Promise<void> {
        const event: RoomCreatedEvent = {
            ...this.createBaseEvent("room.created"),
            data: roomData,
        };

        await rabbitMQService.publishMessage("room.created", event);
    }

    static async publishRoomUpdated(roomData: {
        roomId: string;
        name?: string;
        updatedBy: string;
        updatedFields: string[];
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("room.updated"),
            data: roomData,
        };

        await rabbitMQService.publishMessage("room.updated", event);
    }

    static async publishRoomDeleted(roomData: {
        roomId: string;
        deletedBy: string;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("room.deleted"),
            data: roomData,
        };

        await rabbitMQService.publishMessage("room.deleted", event);
    }

    static async publishUserJoinedRoom(eventData: {
        roomId: string;
        userId: string;
        joinedAt: Date;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("room.user.joined"),
            data: eventData,
        };

        await rabbitMQService.publishMessage("room.user.joined", event);
    }

    static async publishUserLeftRoom(eventData: {
        roomId: string;
        userId: string;
        leftAt: Date;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("room.user.left"),
            data: eventData,
        };

        await rabbitMQService.publishMessage("room.user.left", event);
    }

    // Notification Events
    static async publishNotification(notificationData: {
        userId: string;
        title: string;
        message: string;
        type: "email" | "push" | "sms";
    }): Promise<void> {
        const event: NotificationEvent = {
            ...this.createBaseEvent("notification.send"),
            data: notificationData,
        };

        await rabbitMQService.publishMessage("notification.send", event);
    }

    // Chat Events
    static async publishMessageSent(messageData: {
        messageId: string;
        senderId: string;
        receiverId?: string; // for direct messages
        roomId?: string; // for room messages
        content: string;
        timestamp: Date;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("chat.message.sent"),
            data: messageData,
        };

        await rabbitMQService.publishMessage("chat.message.sent", event);
    }

    static async publishMessageUpdated(messageData: {
        messageId: string;
        senderId: string;
        newContent: string;
        updatedAt: Date;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("chat.message.updated"),
            data: messageData,
        };

        await rabbitMQService.publishMessage("chat.message.updated", event);
    }

    static async publishMessageDeleted(messageData: {
        messageId: string;
        senderId: string;
        deletedAt: Date;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("chat.message.deleted"),
            data: messageData,
        };

        await rabbitMQService.publishMessage("chat.message.deleted", event);
    }

    // File Events
    static async publishFileUploaded(fileData: {
        fileId: string;
        userId: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("file.uploaded"),
            data: fileData,
        };

        await rabbitMQService.publishMessage("file.uploaded", event);
    }

    static async publishFileDeleted(fileData: {
        fileId: string;
        userId: string;
        fileName: string;
    }): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent("file.deleted"),
            data: fileData,
        };

        await rabbitMQService.publishMessage("file.deleted", event);
    }

    // Generic event publisher for custom events
    static async publishCustomEvent(
        eventType: string,
        data: any,
        routingKey?: string
    ): Promise<void> {
        const event: BaseEvent = {
            ...this.createBaseEvent(eventType),
            data,
        };

        const key = routingKey || eventType;
        await rabbitMQService.publishMessage(key, event);
    }

    // Batch event publisher
    static async publishBatchEvents(
        events: Array<{
            type: string;
            data: any;
            routingKey?: string;
        }>
    ): Promise<void> {
        const publishPromises = events.map(({ type, data, routingKey }) =>
            this.publishCustomEvent(type, data, routingKey)
        );

        await Promise.all(publishPromises);
    }
}
