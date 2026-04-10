import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly enabled: boolean;
  private readonly connection?: { url: string };
  private readonly reminderQueue?: Queue;
  private readonly exportQueue?: Queue;
  private readonly pdfQueue?: Queue;
  private reminderWorker?: Worker;
  private exportWorker?: Worker;
  private pdfWorker?: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const disabled = String(this.configService.get("REDIS_DISABLED") ?? "false") === "true";
    const redisUrl = this.configService.get<string>("REDIS_URL");

    this.enabled = !disabled && Boolean(redisUrl);

    if (!this.enabled) {
      this.logger.warn("Redis/BullMQ disabled. Background jobs will not run.");
      return;
    }

    this.connection = { url: redisUrl! };
    this.reminderQueue = new Queue("reminders", { connection: this.connection });
    this.exportQueue = new Queue("exports", { connection: this.connection });
    this.pdfQueue = new Queue("pdf", { connection: this.connection });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled || !this.connection) {
      return;
    }

    this.reminderWorker = new Worker(
      "reminders",
      async (job) => {
        const reminderJobId = String(job.data.reminderJobId);

        await this.prisma.reminderJob.update({
          where: { id: reminderJobId },
          data: {
            status: "SENT",
            attempts: {
              increment: 1
            }
          }
        });

        const reminder = await this.prisma.reminderJob.findUnique({
          where: { id: reminderJobId }
        });

        if (reminder) {
          await this.prisma.notificationLog.create({
            data: {
              tenantId: reminder.tenantId,
              userId: reminder.createdByUserId,
              title: `Reminder ${reminder.channel}`,
              message: `Scheduled reminder executed for appointment ${reminder.appointmentId ?? "N/A"}`,
              channel: reminder.channel,
              status: "SENT",
              metadata: reminder.payload as Prisma.InputJsonValue
            }
          });
        }
      },
      { connection: this.connection }
    );

    this.exportWorker = new Worker(
      "exports",
      async (job) => {
        this.logger.log(`Processed export job ${job.id}`);
      },
      { connection: this.connection }
    );

    this.pdfWorker = new Worker(
      "pdf",
      async (job) => {
        this.logger.log(`Processed PDF job ${job.id}`);
      },
      { connection: this.connection }
    );

    this.reminderWorker.on("failed", async (job, error) => {
      if (!job) {
        return;
      }

      const reminderJobId = String(job.data.reminderJobId);
      await this.prisma.reminderJob.updateMany({
        where: { id: reminderJobId },
        data: {
          status: "FAILED",
          attempts: {
            increment: 1
          }
        }
      });

      this.logger.error(`Reminder job failed ${job.id}: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.reminderWorker?.close();
    await this.exportWorker?.close();
    await this.pdfWorker?.close();
    await this.reminderQueue?.close();
    await this.exportQueue?.close();
    await this.pdfQueue?.close();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleDueReminders(): Promise<void> {
    if (!this.enabled || !this.reminderQueue) {
      return;
    }

    const due = await this.prisma.reminderJob.findMany({
      where: {
        status: "PENDING",
        scheduledFor: {
          lte: new Date()
        }
      },
      take: 100
    });

    for (const reminder of due) {
      await this.reminderQueue.add(
        `reminder-${reminder.id}`,
        {
          reminderJobId: reminder.id
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000
          },
          removeOnComplete: true,
          removeOnFail: 1000
        }
      );

      await this.prisma.reminderJob.update({
        where: { id: reminder.id },
        data: {
          status: "SENT"
        }
      });
    }
  }

  async enqueuePdf(payload: Record<string, unknown>): Promise<void> {
    if (!this.enabled || !this.pdfQueue) {
      return;
    }

    await this.pdfQueue.add("pdf-task", payload, {
      attempts: 3,
      removeOnComplete: true
    });
  }

  async enqueueExport(payload: Record<string, unknown>): Promise<void> {
    if (!this.enabled || !this.exportQueue) {
      return;
    }

    await this.exportQueue.add("export-task", payload, {
      attempts: 3,
      removeOnComplete: true
    });
  }
}
