import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import * as Joi from "joi";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { UsersModule } from "./users/users.module";
import { PatientsModule } from "./patients/patients.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { WaitingRoomModule } from "./waiting-room/waiting-room.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { MedicationsModule } from "./medications/medications.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { DocumentsModule } from "./documents/documents.module";
import { CnamModule } from "./cnam/cnam.module";
import { FinanceModule } from "./finance/finance.module";
import { FilesModule } from "./files/files.module";
import { BackupsModule } from "./backups/backups.module";
import { JobsModule } from "./jobs/jobs.module";
import { ReportsModule } from "./reports/reports.module";
import { SettingsModule } from "./settings/settings.module";
import { AdminModule } from "./admin/admin.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
        PORT: Joi.number().default(3000),
        WEB_ORIGIN: Joi.string().default("http://localhost:5173"),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_TTL: Joi.string().default("15m"),
        JWT_REFRESH_TTL: Joi.string().default("7d"),
        REDIS_DISABLED: Joi.boolean().default(false),
        REDIS_URL: Joi.alternatives().conditional("REDIS_DISABLED", {
          is: true,
          then: Joi.string().allow("").default(""),
          otherwise: Joi.string().required()
        }),
        STORAGE_MODE: Joi.string().valid("local", "s3").default("local"),
        STORAGE_LOCAL_PATH: Joi.string().default("./uploads"),
        S3_ENDPOINT: Joi.string().allow(""),
        S3_REGION: Joi.string().allow(""),
        S3_ACCESS_KEY: Joi.string().allow(""),
        S3_SECRET_KEY: Joi.string().allow(""),
        S3_BUCKET: Joi.string().allow(""),
        COOKIE_SECURE: Joi.boolean().default(false)
      })
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 120
        }
      ]
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    WaitingRoomModule,
    ConsultationsModule,
    MedicationsModule,
    PrescriptionsModule,
    DocumentsModule,
    CnamModule,
    FinanceModule,
    FilesModule,
    BackupsModule,
    JobsModule,
    ReportsModule,
    SettingsModule,
    AdminModule,
    NotificationsModule,
    DashboardModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
