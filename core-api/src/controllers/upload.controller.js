import { uploadToAzure } from '../config/azure-storage.js';

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload buffer to Azure Blob Storage
    const result = await uploadToAzure(req.file.buffer, req.file.originalname);

    res.status(200).json({
      message: 'File uploaded successfully',
      url: result.url,      // The HTTPS URL to store in DB
      filename: result.blobName
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
};