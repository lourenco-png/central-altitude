import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { extname } from 'path';

type UploadApiResponse = { secure_url: string; public_id: string; [key: string]: any };

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new InternalServerErrorException('Cloudinary não configurado.');
    }

    return new Promise((resolve, reject) => {
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const isImage = imageTypes.includes(file.mimetype);
      const resourceType = isImage ? 'image' : 'raw';

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'central-altitude/documentos',
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          // Cloudinary raw uploads não incluem a extensão na secure_url.
          // Sem a extensão o browser recebe Content-Type: application/octet-stream
          // e não sabe abrir o arquivo no formato correto (PDF, Word, Excel...).
          // Solução: anexar a extensão original à URL antes de salvar no banco.
          if (!isImage) {
            const ext = extname(file.originalname).toLowerCase();
            if (ext && !result!.secure_url.endsWith(ext)) {
              result!.secure_url = result!.secure_url + ext;
            }
          }
          resolve(result!);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}
