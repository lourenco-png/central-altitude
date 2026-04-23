import { Controller, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Backup')
@Controller('admin/backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  /**
   * POST /admin/backup — dispara backup manual (somente ADMIN).
   * Retorna chave do arquivo no R2 e tamanho em bytes.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async triggerBackup(@Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente administradores podem disparar backups');
    }
    return this.backup.backupNow();
  }
}
