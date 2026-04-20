import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, Delete, Param, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename, normalize } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
      if (allowed.test(extname(file.originalname).toLowerCase())) cb(null, true);
      else cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const base = process.env.API_BASE_URL || 'http://localhost:3001';
    return {
      url: `${base}/uploads/${file.filename}`,
      publicId: file.filename,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Delete(':filename')
  deleteFile(@Param('filename') filename: string) {
    // Previne path traversal: aceita apenas o basename sem diretórios
    const safe = basename(normalize(filename));
    if (!safe || safe !== filename || safe.includes('..') || safe.includes('/')) {
      throw new BadRequestException('Nome de arquivo inválido');
    }
    const filePath = join(UPLOAD_DIR, safe);
    // Garante que o caminho final está dentro do diretório de uploads
    if (!filePath.startsWith(UPLOAD_DIR)) {
      throw new BadRequestException('Nome de arquivo inválido');
    }
    if (!existsSync(filePath)) throw new NotFoundException('Arquivo não encontrado');
    unlinkSync(filePath);
    return { deleted: true };
  }
}
