import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { format } from 'date-fns';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Executa backup diário às 02:00 UTC.
   * pg_dump → gzip → upload para R2 em backups/YYYY-MM-DD_HH-mm.sql.gz
   * Mantém os últimos 30 backups; os mais antigos são removidos automaticamente.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyBackup() {
    this.logger.log('Iniciando backup diário do banco de dados...');
    try {
      await this.backupNow();
    } catch (err) {
      this.logger.error('Backup diário falhou', err?.message ?? err);
    }
  }

  /** Executa o backup manualmente (usado pelo endpoint de admin). */
  async backupNow(): Promise<{ key: string; sizeBytes: number }> {
    if (!this.storage.isConfigured) {
      throw new Error(
        'R2 não configurado — defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME nas variáveis de ambiente.',
      );
    }

    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) throw new Error('DATABASE_URL não definida');

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const key = `backups/central_altitude_${timestamp}.sql.gz`;

    const buffer = await this.dumpToBuffer(databaseUrl);
    await this.storage.upload(key, buffer, 'application/gzip', key.split('/').pop()!);

    this.logger.log(`Backup enviado para R2: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Remove backups com mais de 30 dias
    await this.pruneOldBackups(30);

    return { key, sizeBytes: buffer.length };
  }

  /** Executa pg_dump e retorna o dump comprimido como Buffer. */
  private dumpToBuffer(databaseUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pg = spawn('pg_dump', ['--no-owner', '--no-acl', databaseUrl], {
        env: { ...process.env, PGPASSWORD: this.extractPassword(databaseUrl) },
      });

      const gzip = createGzip();
      const chunks: Buffer[] = [];

      pg.stdout.pipe(gzip);

      gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);

      pg.stderr.on('data', (data: Buffer) => {
        const msg = data.toString();
        // pg_dump emite warnings em stderr que não são fatais
        if (!msg.toLowerCase().includes('warning')) {
          this.logger.warn(`pg_dump stderr: ${msg}`);
        }
      });

      pg.on('error', (err) => reject(new Error(`pg_dump não encontrado: ${err.message}`)));
      pg.on('close', (code) => {
        if (code !== 0) reject(new Error(`pg_dump saiu com código ${code}`));
      });
    });
  }

  /** Extrai a senha da DATABASE_URL para definir PGPASSWORD. */
  private extractPassword(url: string): string {
    try {
      return new URL(url).password;
    } catch {
      return '';
    }
  }

  /** Remove do R2 backups com mais de {maxDays} dias. */
  private async pruneOldBackups(maxDays: number) {
    const files = await this.storage.list('backups/');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);

    const toDelete = files.filter(f => f.lastModified < cutoff);
    for (const f of toDelete) {
      await this.storage.delete(f.key);
      this.logger.log(`Backup antigo removido do R2: ${f.key}`);
    }
  }
}
