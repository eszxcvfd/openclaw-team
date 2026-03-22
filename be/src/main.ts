import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { ToolCallLoggingInterceptor } from './modules/tool-gateway/tool-call-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    app.get(ToolCallLoggingInterceptor),
    new SuccessResponseInterceptor(),
  );

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  console.log(`Backend server running on http://localhost:${port}`);
}

void bootstrap();
