import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload team logo to Cloudinary
 */
export async function uploadTeamLogo(
  file: Buffer | string,
  teamName: string,
  oldPublicId?: string
): Promise<UploadResult> {
  try {
    // Validate file size (max 2MB)
    if (file instanceof Buffer && file.length > 2 * 1024 * 1024) {
      throw new Error('File size exceeds 2MB limit');
    }

    // Generate public ID for the logo
    const publicId = `team-logos/${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    logger.info('Uploading team logo to Cloudinary', {
      teamName,
      publicId,
      fileSize: file instanceof Buffer ? file.length : 'unknown'
    });

    // Upload to Cloudinary with transformations
    const result = await cloudinary.uploader.upload(
      file instanceof Buffer ? `data:image/png;base64,${file.toString('base64')}` : file,
      {
        public_id: publicId,
        folder: 'team-logos',
        transformation: [
          {
            width: 200,
            height: 200,
            crop: 'fill',
            gravity: 'center',
            quality: 'auto',
            format: 'webp'
          }
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        resource_type: 'image'
      }
    );

    // Delete old logo if provided
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
        logger.info('Old team logo deleted', { oldPublicId });
      } catch (deleteError) {
        logger.warn('Failed to delete old team logo', {
          oldPublicId,
          error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
        });
      }
    }

    const uploadResult: UploadResult = {
      publicUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };

    logger.info('Team logo uploaded successfully', {
      teamName,
      publicUrl: uploadResult.publicUrl,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    });

    return uploadResult;
  } catch (error) {
    logger.error('Failed to upload team logo', {
      teamName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Delete team logo from Cloudinary
 */
export async function deleteTeamLogo(publicId: string): Promise<void> {
  try {
    logger.info('Deleting team logo from Cloudinary', { publicId });

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      throw new Error(`Failed to delete logo: ${result.result}`);
    }

    logger.info('Team logo deleted successfully', { publicId });
  } catch (error) {
    logger.error('Failed to delete team logo', {
      publicId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Validate uploaded file
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
    };
  }

  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'File size exceeds 2MB limit.'
    };
  }

  return { isValid: true };
}