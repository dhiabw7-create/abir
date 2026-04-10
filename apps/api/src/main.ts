import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { promises as fs } from "fs";
import path from "path";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:5173"],
      credentials: true
    }
  });

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const storageLocalPath = process.env.STORAGE_LOCAL_PATH ?? "./uploads";
  const uploadsDir = path.resolve(process.cwd(), storageLocalPath);
  await fs.mkdir(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: "/uploads/" });

  const config = new DocumentBuilder()
    .setTitle("MedFlow API")
    .setDescription("Clinic management multi-tenant API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
