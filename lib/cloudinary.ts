import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  originalFilename: string;
  size: number;
}

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    publicId?: string;
    originalFilename?: string;
  } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'mridha-villa-2',
      resource_type: options.resourceType || 'auto',
      public_id: options.publicId,
      use_filename: true,
      unique_filename: true,
    };

    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error || !result) {
        reject(error || new Error('Upload failed'));
        return;
      }

      resolve({
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        originalFilename: options.originalFilename || result.original_filename || '',
        size: result.bytes,
      });
    }).end(file);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

// Allowed file types for upload
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFileUpload(file: File, allowedTypes: string[]): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

export function getUploadFolder(entityType: string): string {
  const folders: Record<string, string> = {
    unit: 'mridha-villa-2/units',
    tenant: 'mridha-villa-2/tenants',
    payment: 'mridha-villa-2/payments',
    electricity: 'mridha-villa-2/electricity',
    gas: 'mridha-villa-2/gas',
    expense: 'mridha-villa-2/expenses',
    agreement: 'mridha-villa-2/agreements',
  };
  return folders[entityType] || 'mridha-villa-2/misc';
}
