import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';

// Mock the azure-storage module before importing the controller
const mockUploadToAzure = jest.fn();
jest.unstable_mockModule('../../src/config/azure-storage.js', () => ({
    uploadToAzure: mockUploadToAzure
}));

// Now import the controller (after the mock is set up)
const { uploadFile } = await import('../../src/controllers/upload.controller.js');

describe('Upload Controller', () => {
    let req, res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        jest.spyOn(console, 'error').mockImplementation(() => {}); 
        mockUploadToAzure.mockClear();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 if no file uploaded', async () => {
        await uploadFile(req, res);

        expect(res.statusCode).toBe(400);
        expect(res._getJSONData()).toEqual({ error: 'No file uploaded' });
    });

    test('should return 200 and file details if file uploaded', async () => {
        const file = {
            buffer: Buffer.from('test file content'),
            originalname: 'test-file.jpg',
        };
        req.file = file;

        // Mock Azure upload response
        const mockAzureResponse = {
            url: 'https://storageaccount.blob.core.windows.net/uploads/uuid-123.jpg',
            blobName: 'uuid-123.jpg'
        };
        mockUploadToAzure.mockResolvedValue(mockAzureResponse);

        await uploadFile(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            message: 'File uploaded successfully',
            url: mockAzureResponse.url,
            filename: mockAzureResponse.blobName,
        });
        expect(mockUploadToAzure).toHaveBeenCalledWith(file.buffer, file.originalname);
    });

    test('should return 500 on azure upload error', async () => {
        const file = {
            buffer: Buffer.from('test file content'),
            originalname: 'test-file.jpg',
        };
        req.file = file;

        const error = new Error('Azure upload failed');
        mockUploadToAzure.mockRejectedValue(error);

        await uploadFile(req, res);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            error: 'File upload failed',
            details: error.message
        });
    });
});
