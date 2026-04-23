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

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /uploads — salva arquivo no banco (requer autenticação) */
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

    const saved = await this.prisma.file.create({
      data: {
        data:         file.buffer,
        mimetype:     file.mimetype,
        originalname: file.originalname,
        size:         file.size,
        storage:      'DB',
      },
    });

    const base = (process.env.API_BASE_URL || 'https://central-altitude.onrender.com').replace(/\/$/, '');
    return {
      url:      `${base}/uploads/${saved.id}`,
      publicId: saved.id,
      filename: file.originalname,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  /** GET /uploads/:id — serve o arquivo com Content-Type correto (público) */
  @Get(':id')
  async serveFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Arquivo não encontrado');

    const inlineTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const disposition = inlineTypes.includes(file.mimetype) ? 'inline' : 'attachment';

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', file.size);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(file.originalname)}"`,
    );
    res.send(file.data);
  }
}
