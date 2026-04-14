import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, nome: true, role: true, avatar: true, ativo: true, createdAt: true },
      orderBy: { nome: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, nome: true, role: true, avatar: true, ativo: true },
    });
  }

  update(id: string, data: { nome?: string; role?: any; ativo?: boolean; avatar?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
