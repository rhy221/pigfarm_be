// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { AppModule } from './app.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// (BigInt.prototype as any).toJSON = function () {
//   return this.toString();
// };

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

// app.enableCors({
//   origin: [
//     process.env.FRONTEND_URL || 'https://pigfarm-fe.vercel.app', // Link chính thức
//     'http://localhost:3000'          // Link local
//   ],
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//   allowedHeaders: 'Content-Type,Accept,Authorization',
//   credentials: true, // Thêm dòng này nếu bạn có dùng Token/Cookie
//   optionsSuccessStatus: 204,
// });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//       transformOptions: { enableImplicitConversion: true },
//     }),
//   );

//   const config = new DocumentBuilder()
//     .setTitle('Pig Farm Management API')
//     .setDescription('API quản lý trại heo - Kho và Chi phí')
//     .setVersion('1.0')
//     .addBearerAuth()
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api/docs', app, document);

//   const port = process.env.PORT || 3001;
//   await app.listen(port);
//   console.log(`Application is running on: http://localhost:${port}`);
//   console.log(`Swagger docs: http://localhost:${port}/api/docs`);
// }

// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express'; // Đã sửa cách import

const server = express();

export const bootstrap = async (expressInstance: any) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  }));

  await app.init();
  return app;
};

// Chạy cho Vercel (Production)
if (process.env.NODE_ENV === 'production') {
  bootstrap(server);
} else {
  // Chạy cho Local
  async function devBootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(3001);
  }
  devBootstrap();
}

export default server;