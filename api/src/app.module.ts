import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    PrismaModule,
    AuthModule,
    UsersModule,
    TopografiaModule,
    RhModule,
    ComercialModule,
    NotificacoesModule,
    UploadsModule,
  ],
})
export class AppModule {}
