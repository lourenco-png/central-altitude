import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
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
      throw new InternalServerErrorException('Cloudinary não configurado. Defina as variáveis CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.');
    }

    return new Promise((resolve, reject) => {
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const resourceType = imageTypes.includes(file.mimetype) ? 'image' : 'raw';
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'central-altitude/documentos',
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}
