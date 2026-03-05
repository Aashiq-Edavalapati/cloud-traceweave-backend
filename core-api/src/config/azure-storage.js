import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Azure Storage Configuration - supports both Connection String and SAS Token
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';

// Initialize Azure Blob Service Client
let blobServiceClient;
let containerClient;

if (AZURE_STORAGE_CONNECTION_STRING) {
  // Use connection string (permanent access)
  console.log('🔑 Using Azure Storage Connection String');
  blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  // Create container if it doesn't exist
  containerClient.createIfNotExists({ access: 'blob' })
    .then(() => console.log(`✅ Azure Storage container "${CONTAINER_NAME}" is ready`))
    .catch(err => console.error('⚠️  Error creating container:', err.message));
} else if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_SAS_TOKEN) {
  // Use SAS token (temporary access)
  console.log('🔑 Using Azure Storage SAS Token');
  const accountUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`;
  blobServiceClient = new BlobServiceClient(accountUrl);
  containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  console.log(`✅ Azure Storage container "${CONTAINER_NAME}" configured with SAS`);
} else {
  console.warn('⚠️  Azure Storage not configured. Set either AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_SAS_TOKEN');
}

// Configure Multer to use memory storage
const storage = multer.memoryStorage();

// File filter for allowed formats
const fileFilter = (req, file, cb) => {
  const allowedFormats = ['jpg', 'png', 'jpeg', 'webp'];
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedFormats.join(', ')} are allowed.`), false);
  }
};

// Initialize Multer with memory storage
const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper function to upload buffer to Azure Blob Storage
export const uploadToAzure = async (buffer, originalname) => {
  if (!containerClient) {
    throw new Error('Azure Storage is not configured');
  }

  const ext = path.extname(originalname);
  const blobName = `${uuidv4()}${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Determine content type
  const contentType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }[ext.toLowerCase()] || 'application/octet-stream';

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  return {
    url: blockBlobClient.url,
    blobName: blobName
  };
};

export { upload, containerClient };