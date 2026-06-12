import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. AWS S3 Config
const s3AccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3Region = process.env.AWS_REGION;
const s3BucketName = process.env.AWS_BUCKET_NAME;

const isS3Configured = !!(s3AccessKeyId && s3SecretAccessKey && s3Region && s3BucketName);
let s3Client = null;

if (isS3Configured) {
  try {
    s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey
      }
    });
    console.log('[Storage Service] AWS S3 Client Initialized Successfully.');
  } catch (error) {
    console.error('[Storage Service] Error initializing AWS S3 Client:', error.message);
  }
}

// 2. Google Drive Config
const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const drivePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const isDriveConfigured = !!(driveEmail && drivePrivateKey && driveFolderId);
let driveClient = null;

if (isDriveConfigured) {
  try {
    const formattedPrivateKey = drivePrivateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: driveEmail,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    driveClient = google.drive({ version: 'v3', auth });
    console.log('[Storage Service] Google Drive Client Initialized.');
  } catch (error) {
    console.error('[Storage Service] Error initializing Google Drive:', error.message);
  }
}

if (!isS3Configured && !isDriveConfigured) {
  console.log('[Storage Service] No cloud providers configured. Defaulting to local uploads.');
}

/**
 * Upload file using primary (S3), secondary (Drive), or local fallback
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {string} mimeType 
 * @returns {Promise<{ fileId: string, webViewLink: string }>}
 */
export const uploadFile = async (fileBuffer, fileName, mimeType) => {
  // 1. Try AWS S3
  if (isS3Configured && s3Client) {
    try {
      const timestamp = Date.now();
      const fileExt = path.extname(fileName);
      const baseName = path.basename(fileName, fileExt);
      const key = `${baseName}_${timestamp}${fileExt}`;

      const uploadParams = {
        Bucket: s3BucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      const webViewLink = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${key}`;
      
      console.log(`[Storage Service] Uploaded to S3 successfully: ${key}`);
      return { fileId: key, webViewLink };
    } catch (error) {
      console.error('[Storage Service] AWS S3 upload failed, trying next provider:', error.message);
    }
  }

  // 2. Try Google Drive
  if (isDriveConfigured && driveClient) {
    try {
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [driveFolderId]
      };
      
      const media = {
        mimeType: mimeType,
        body: stream
      };

      const response = await driveClient.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      const fileId = response.data.id;

      await driveClient.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const fileInfo = await driveClient.files.get({
        fileId: fileId,
        fields: 'webViewLink'
      });

      console.log(`[Storage Service] Uploaded to Google Drive successfully: ${fileId}`);
      return {
        fileId: fileId,
        webViewLink: fileInfo.data.webViewLink
      };
    } catch (error) {
      console.error('[Storage Service] Google Drive upload failed, trying next provider:', error.message);
    }
  }

  // 3. Fallback to Local Storage
  return uploadLocalFallback(fileBuffer, fileName);
};

/**
 * Delete file from S3, Drive, or local storage
 * @param {string} fileId 
 * @param {string} driveLink 
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileId, driveLink) => {
  // 1. Handle S3 deletion
  if (driveLink && driveLink.includes('.s3.') && driveLink.includes('amazonaws.com')) {
    if (isS3Configured && s3Client) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: s3BucketName,
          Key: fileId
        }));
        console.log(`[Storage Service] Deleted from S3: ${fileId}`);
        return;
      } catch (error) {
        console.error('[Storage Service] Failed to delete from S3:', error.message);
      }
    }
  }

  // 2. Handle Google Drive deletion
  if (driveClient && !fileId.startsWith('mock_') && (!driveLink || (!driveLink.includes('.s3.') && !driveLink.startsWith('/uploads/')))) {
    try {
      await driveClient.files.delete({ fileId });
      console.log(`[Storage Service] Deleted from Google Drive: ${fileId}`);
      return;
    } catch (error) {
      console.error('[Storage Service] Failed to delete from Google Drive:', error.message);
    }
  }

  // 3. Handle local deletion
  try {
    if (driveLink && driveLink.startsWith('/uploads/')) {
      const localFileName = path.basename(driveLink);
      const localFilePath = path.join(uploadDir, localFileName);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`[Storage Service] Deleted local file: ${localFileName}`);
      }
    }
  } catch (error) {
    console.error('[Storage Service] Failed to delete local file:', error.message);
  }
};

const uploadLocalFallback = (fileBuffer, fileName) => {
  const timestamp = Date.now();
  const fileExt = path.extname(fileName);
  const baseName = path.basename(fileName, fileExt);
  const uniqueFileName = `${baseName}_${timestamp}${fileExt}`;
  
  const filePath = path.join(uploadDir, uniqueFileName);
  fs.writeFileSync(filePath, fileBuffer);
  
  console.log(`[Storage Service] Saved file locally: ${uniqueFileName}`);
  
  return {
    fileId: `mock_drive_id_${timestamp}`,
    webViewLink: `/uploads/${uniqueFileName}`
  };
};
