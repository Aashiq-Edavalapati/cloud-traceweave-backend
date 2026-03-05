import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testAzureUpload = async () => {
    try {
        console.log('🧪 Testing Azure Storage Upload...\n');

        // Get credentials from environment
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';

        let blobServiceClient;
        let containerClient;

        if (connectionString) {
            console.log('🔑 Using Connection String authentication');
            blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            containerClient = blobServiceClient.getContainerClient(containerName);
        } else if (accountName && sasToken) {
            console.log('🔑 Using SAS Token authentication');
            const accountUrl = `https://${accountName}.blob.core.windows.net?${sasToken}`;
            blobServiceClient = new BlobServiceClient(accountUrl);
            containerClient = blobServiceClient.getContainerClient(containerName);
        } else {
            throw new Error('❌ No Azure Storage credentials found. Set either:\n' +
                '   - AZURE_STORAGE_CONNECTION_STRING, or\n' +
                '   - AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_SAS_TOKEN');
        }

        console.log(`✅ Connected to storage account: ${accountName || 'from connection string'}`);
        console.log(`✅ Container: ${containerName}\n`);

        // Try to list blobs to verify access (skip container creation with SAS)
        if (connectionString) {
            // Only try to create container if using connection string
            const createContainerResponse = await containerClient.createIfNotExists({
                access: 'blob'
            });
            if (createContainerResponse.succeeded) {
                console.log('✅ Container created successfully');
            } else {
                console.log('✅ Container already exists');
            }
        } else {
            console.log('ℹ️  Using SAS token - skipping container creation check');
        }

        // Create a test file buffer
        const testFileName = `test-${uuidv4()}.txt`;
        const testContent = `Test upload at ${new Date().toISOString()}\nThis is a test file to verify Azure Storage upload functionality.`;
        const buffer = Buffer.from(testContent, 'utf-8');

        console.log(`\n📤 Uploading test file: ${testFileName}`);
        console.log(`   Size: ${buffer.length} bytes`);

        // Upload the buffer
        const blockBlobClient = containerClient.getBlockBlobClient(testFileName);
        const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { 
                blobContentType: 'text/plain' 
            }
        });

        console.log(`✅ Upload successful!`);
        console.log(`   Request ID: ${uploadResponse.requestId}`);
        console.log(`   ETag: ${uploadResponse.etag}\n`);

        // Get the blob URL
        const blobUrl = blockBlobClient.url;
        console.log('🔗 File URL:');
        console.log(`   ${blobUrl}\n`);

        // Verify the file exists by getting its properties
        console.log('🔍 Verifying upload...');
        const properties = await blockBlobClient.getProperties();
        console.log(`✅ File verified!`);
        console.log(`   Content Length: ${properties.contentLength} bytes`);
        console.log(`   Content Type: ${properties.contentType}`);
        console.log(`   Last Modified: ${properties.lastModified}\n`);

        // Try to download and read the content
        console.log('📥 Downloading file to verify content...');
        const downloadResponse = await blockBlobClient.download();
        const downloadedContent = await streamToBuffer(downloadResponse.readableStreamBody);
        const downloadedText = downloadedContent.toString('utf-8');

        if (downloadedText === testContent) {
            console.log('✅ Content verification successful!\n');
        } else {
            console.log('❌ Content mismatch!\n');
        }

        // List all files in the container
        console.log('📋 Listing files in container:');
        let fileCount = 0;
        for await (const blob of containerClient.listBlobsFlat()) {
            fileCount++;
            if (fileCount <= 5) {
                console.log(`   - ${blob.name} (${blob.properties.contentLength} bytes)`);
            }
        }
        console.log(`   Total files: ${fileCount}\n`);

        console.log('✅ ✅ ✅ All tests passed! Azure Storage is working correctly! ✅ ✅ ✅\n');

        return {
            success: true,
            url: blobUrl,
            fileName: testFileName
        };

    } catch (error) {
        console.error('\n❌ Test failed!');
        console.error(`Error: ${error.message}`);
        
        if (error.code === 'ENOTFOUND') {
            console.error('\nPossible issues:');
            console.error('  - Check your internet connection');
            console.error('  - Verify the storage account name in connection string');
        } else if (error.statusCode === 403) {
            console.error('\nPossible issues:');
            console.error('  - Invalid account key');
            console.error('  - Storage account access denied');
        }
        
        return {
            success: false,
            error: error.message
        };
    }
};

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

// Run the test
testAzureUpload()
    .then((result) => {
        if (!result.success) {
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
