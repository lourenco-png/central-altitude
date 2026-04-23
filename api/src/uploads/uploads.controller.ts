import {
  Controller, Post, Get, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, NotFoundException,
  Param, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** POST /uploads — salva arquivo no R2 (ou banco como fallback). Requer autenticação. */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
      if (allowed.test(extname(file.originalname).toLowerCase())) cb(null, true);
      else cb(new BadRequestException('Tipo não permitido. Use PDF, Word, Excel ou imagem.'), false);
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');

    const base = (process.env.API_BASE_URL || 'https://central-altitude.onrender.com').replace(/\/$/, '');

    // ── R2 disponível → armazena externamente ─────────────────────────────
    if (this.storage.isConfigured) {
      const ext  = extname(file.originalname).toLowerCase();
      const key  = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

      await this.storage.upload(key, file.buffer, file.mimetype, file.originalname);

      const saved = await this.prisma.file.create({
        data: {
          mimetype:     file.mimetype,
          originalname: file.originalname,
          size:         file.size,
          storage:      'R2',
          key,
          // data permanece null — arquivo está no R2
        },
      });

      return {
        url:      `${base}/uploads/${saved.id}`,
        publicId: saved.id,
        filename: file.originalname,
        size:     file.size,
        mimetype: file.mimetype,
      };
    }

    // ── Fallback: salva BYTEA no banco ────────────────────────────────────
    const saved = await this.prisma.file.create({
      data: {
        data:         file.buffer,
        mimetype:     file.mimetype,
        originalname: file.originalname,
        size:         file.size,
        storage:      'DB',
      },
    });

    return {
      url:      `${base}/uploads/${saved.id}`,
      publicId: saved.id,
      filename: file.originalname,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  /** GET /uploads/:id — serve o arquivo com Content-Type correto (público). */
  @Get(':id')
  async serveFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Arquivo não encontrado');

    const inlineTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const disposition = inlineTypes.includes(file.mimetype) ? 'inline' : 'attachment';

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalname)}"`);

    // ── Arquivo no R2 ─────────────────────────────────────────────────────
    if (file.storage === 'R2' && file.key) {
      const { buffer } = await this.storage.download(file.key);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // ── Arquivo legado no banco ────────────────────────────────────────────
    if (file.data) {
      res.setHeader('Content-Length', file.size);
      return res.send(file.data);
    }

    throw new NotFoundException('Dados do arquivo não encontrados');
  }
}
