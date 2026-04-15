import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, Delete, Param
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from './cloudinary.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private cloudinary: CloudinaryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
      if (allowed.test(extname(file.originalname).toLowerCase())) cb(null, true);
      else cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinary.upload(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Delete(':publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    await this.cloudinary.delete(publicId);
    return { deleted: true };
  }
}
