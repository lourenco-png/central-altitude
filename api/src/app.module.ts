import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TopografiaModule } from './topografia/topografia.module';
import { RhModule } from './rh/rh.module';
import { ComercialModule } from './comercial/comercial.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,   // janela de 60 segundos
        limit: 120,   // 120 req/min por IP — tráfego normal de SaaS
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TopografiaModule,
    RhModule,
    ComercialModule,
    NotificacoesModule,
    UploadsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
