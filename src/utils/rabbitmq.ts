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
    try {
      console.log("=== RabbitMQ Connection Attempt ===");
      console.log("RABBITMQ_URL:", RABBITMQ_URL);
      console.log("Connecting to RabbitMQ...");

      this.connection = (await amqp.connect(RABBITMQ_URL)) as any;
      console.log("RabbitMQ connection established");

      this.channel = await (this.connection as any).createChannel();
      console.log("RabbitMQ channel created");

      // Declare the main exchange
      await this.channel!.assertExchange("chumme_exchange", "topic", {
        durable: true,
      });

      this.isConnected = true;
      console.log("Successfully connected to RabbitMQ");

      // Handle connection events
      (this.connection as any).on("error", (err: any) => {
        console.error("RabbitMQ connection error:", err);
        this.isConnected = false;
      });

      (this.connection as any).on("close", () => {
        console.log("RabbitMQ connection closed");
        this.isConnected = false;
        this.reconnect();
      });
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      this.isConnected = false;
      throw error;
    }
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

  async publishMessage(
    routingKey: string,
    message: any,
    options?: amqp.Options.Publish,
  ): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error("RabbitMQ not connected");
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(
        "chumme_exchange",
        routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...options,
        },
      );

      if (!published) {
        throw new Error("Failed to publish message");
      }

      console.log(`Message published to ${routingKey}:`, message);
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
    if (!this.isConnected || !this.channel) {
      throw new Error("RabbitMQ not connected");
    }

    try {
      const dlxExchange = "chumme_dlx";
      const dlqQueue = `${queueName}_failed`;

      // 1. Assert Dead Letter Exchange and Queue
      await this.channel.assertExchange(dlxExchange, "topic", {
        durable: true,
      });
      await this.channel.assertQueue(dlqQueue, { durable: true });
      await this.channel.bindQueue(dlqQueue, dlxExchange, "#");

      // 2. Assert Main Queue with DLX configuration
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": dlxExchange,
          "x-max-priority": 10,
        },
      });

      // 3. Set Prefetch to limit concurrent processing and prevent RDS connection pool exhaustion
      await this.channel.prefetch(5);

      // Bind the queue to the exchange with routing keys
      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(queueName, "chumme_exchange", routingKey);
        console.log(`Queue ${queueName} bound to routing key: ${routingKey}`);
      }

      // Set up message consumer
      await this.channel.consume(
        queueName,
        async (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            try {
              const messageContent = JSON.parse(msg.content.toString());
              console.log(
                `Received message from ${queueName}:`,
                messageContent,
              );

              await handler(messageContent, msg);

              // Acknowledge the message
              this.channel?.ack(msg);
            } catch (error) {
              console.error(
                `Error processing message from ${queueName}:`,
                error,
              );

              // Reject the message and don't requeue it to avoid infinite loops
              this.channel?.nack(msg, false, false);
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
