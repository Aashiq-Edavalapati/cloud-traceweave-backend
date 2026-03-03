import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const vaultName = "traceweave-vault";
const vaultUrl = `https://${vaultName}.vault.azure.net`;

const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

export const getSecret = async (secretName) => {
  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    console.error(`❌ Failed to retrieve secret ${secretName}:`, error.message);
    throw error;
  }
};