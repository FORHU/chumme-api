import amqp from "amqplib";
import { RABBITMQ_URL } from "../config";

export interface MessageHandler {
  (message: any, originalMsg: amqp.ConsumeMessage): Promise<void>;
}

export class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async connect(): Promise<void> {
    if (this.connection) return;

    try {
      console.log("=== RabbitMQ Connection Attempt ===");
      console.log("RABBITMQ_URL:", RABBITMQ_URL);

      this.connection = (await amqp.connect(RABBITMQ_URL)) as any;
      this.isConnected = true;
      console.log("RabbitMQ connection established");

      // Handle connection events
      (this.connection as any).on("error", (err: any) => {
        console.error("RabbitMQ connection error:", err);
        this.isConnected = false;
        this.connection = null;
        this.channel = null;
      });

      (this.connection as any).on("close", () => {
        console.log("RabbitMQ connection closed");
        this.isConnected = false;
        this.connection = null;
        this.channel = null;
        this.reconnect();
      });
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      this.isConnected = false;
      this.connection = null;
      throw error;
    }
  }

  /**
   * Create a new channel on the existing connection.
   */
  async createChannel(): Promise<amqp.Channel> {
    await this.connect();
    if (!this.connection) throw new Error("Could not establish connection");
    return await (this.connection as any).createChannel();
  }

  /**
   * Get the singleton shared channel (created lazily).
   */
  async getSharedChannel(): Promise<amqp.Channel> {
    if (this.channel) return this.channel;
    this.channel = await this.createChannel();
    // Declare the main exchange on the shared channel
    await this.channel.assertExchange("chumme_exchange", "topic", {
      durable: true,
    });
    return this.channel;
  }

  private async reconnect(): Promise<void> {
    console.log("Attempting to reconnect to RabbitMQ...");
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }, 5000); // Retry after 5 seconds
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      this.isConnected = false;
      console.log("Disconnected from RabbitMQ");
    } catch (error) {
      console.error("Error disconnecting from RabbitMQ:", error);
    }
  }

  async publishMessage(routingKey: string, message: any): Promise<void> {
    const channel = await this.getSharedChannel();

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = channel.publish(
        "chumme_exchange",
        routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      );

      if (!published) {
        throw new Error("Failed to publish message");
      }

      console.log(`Message published to ${routingKey}`);
    } catch (error) {
      console.error("Error publishing message:", error);
      throw error;
    }
  }

  async subscribeToMessages(
    queueName: string,
    routingKeys: string[],
    handler: MessageHandler,
  ): Promise<void> {
    const channel = await this.getSharedChannel();

    try {
      // Assert the queue
      await channel.assertQueue(queueName, {
        durable: true,
      });

      // Bind the queue to the exchange with routing keys
      for (const routingKey of routingKeys) {
        await channel.bindQueue(queueName, "chumme_exchange", routingKey);
        console.log(`Queue ${queueName} bound to routing key: ${routingKey}`);
      }

      // Set up message consumer
      await channel.consume(
        queueName,
        async (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            try {
              const messageContent = JSON.parse(msg.content.toString());
              console.log(`Received message from ${queueName}`);

              await handler(messageContent, msg);

              // Acknowledge the message
              channel.ack(msg);
            } catch (error) {
              console.error(
                `Error processing message from ${queueName}:`,
                error,
              );

              // Reject the message and don't requeue it to avoid infinite loops
              channel.nack(msg, false, false);
            }
          }
        },
      );

      console.log(`Subscribed to queue: ${queueName}`);
    } catch (error) {
      console.error(`Error subscribing to queue ${queueName}:`, error);
      throw error;
    }
  }

  getChannel(): amqp.Channel | null {
    return this.channel;
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

export const rabbitMQService = RabbitMQService.getInstance();
