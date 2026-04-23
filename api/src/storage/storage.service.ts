import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;
  private configured = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const accountId  = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKey  = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretKey  = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket     = this.config.get<string>('R2_BUCKET_NAME');

    if (!accountId || !accessKey || !secretKey || !bucket) {
      this.logger.warn(
        'R2 não configurado (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME). ' +
        'Uploads irão para o PostgreSQL como fallback.',
      );
      return;
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
    this.configured = true;
    this.logger.log(`StorageService conectado ao bucket R2: ${bucket}`);
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  /** Faz upload de um buffer para o R2. Retorna a chave do objeto. */
  async upload(
    key: string,
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ContentDisposition: `inline; filename="${encodeURIComponent(originalname)}"`,
      }),
    );
    return key;
  }

  /** Baixa um objeto do R2 como Buffer. */
  async download(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const stream = resp.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: resp.ContentType ?? 'application/octet-stream',
    };
  }

  /** Remove um objeto do R2. */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Lista objetos com determinado prefixo. Útil para gerenciar backups. */
  async list(prefix: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
    const resp = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    return (resp.Contents ?? []).map(obj => ({
      key: obj.Key!,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? new Date(),
    }));
  }

  /** Converte um Buffer em stream legível (usado no upload de backup). */
  bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
