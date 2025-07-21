import { E2EEncryption } from '../../../shared/src/crypto/e2e-encryption';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  encryptedData: {
    encryptedKeys: string;
    salt: string;
    nonce: string;
  };
}

export interface DirectMessageData {
  recipientId: string;
  content?: string;
  encryptedContent?: string;
  encryptionMetadata?: any;
}

class E2ECryptoService {
  private userKeys: EncryptionKeys | null = null;
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize user's encryption keys
  async initializeKeys(password: string): Promise<EncryptionKeys> {
    try {
      // Generate ECDH and signing key pairs
      const keyPair = await E2EEncryption.generateKeyPair();
      const signingKeyPair = await E2EEncryption.generateSigningKeyPair();
      
      // Serialize keys
      const serializedKeys = await E2EEncryption.serializeKeyPair(keyPair);
      const serializedSigningKeys = await E2EEncryption.serializeKeyPair(signingKeyPair);
      
      // Encrypt private keys with password
      const encryptedData = await E2EEncryption.encryptPrivateKeysWithPassword(
        serializedKeys,
        serializedSigningKeys,
        password
      );
      
      const keys: EncryptionKeys = {
        publicKey: serializedKeys.publicKey,
        privateKey: serializedKeys.privateKey,
        signingPublicKey: serializedSigningKeys.publicKey,
        signingPrivateKey: serializedSigningKeys.privateKey,
        encryptedData,
      };
      
      this.userKeys = keys;
      
      // Store keys securely
      localStorage.setItem('e2e_public_key', keys.publicKey);
      localStorage.setItem('e2e_signing_public_key', keys.signingPublicKey);
      localStorage.setItem('e2e_encrypted_data', JSON.stringify(keys.encryptedData));
      
      return keys;
    } catch (error) {
      console.error('Failed to initialize encryption keys:', error);
      throw new Error('Failed to initialize encryption keys');
    }
  }

  // Load existing keys from storage
  async loadKeys(password: string): Promise<boolean> {
    try {
      const publicKey = localStorage.getItem('e2e_public_key');
      const signingPublicKey = localStorage.getItem('e2e_signing_public_key');
      const encryptedDataStr = localStorage.getItem('e2e_encrypted_data');
      
      if (!publicKey || !signingPublicKey || !encryptedDataStr) {
        return false;
      }

      const encryptedData = JSON.parse(encryptedDataStr);
      
      const decryptedKeys = await E2EEncryption.decryptPrivateKeysWithPassword(
        encryptedData.encryptedKeys,
        encryptedData.salt,
        encryptedData.nonce,
        password
      );
      
      this.userKeys = {
        publicKey,
        privateKey: decryptedKeys.encryption.privateKey,
        signingPublicKey,
        signingPrivateKey: decryptedKeys.signing.privateKey,
        encryptedData,
      };
      
      return true;
    } catch (error) {
      console.error('Failed to load encryption keys:', error);
      return false;
    }
  }

  // Setup keys on the server
  async setupKeysOnServer(token: string): Promise<boolean> {
    if (!this.userKeys) {
      throw new Error('Keys not initialized');
    }

    try {
      const response = await fetch('/api/e2e/setup-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          public_key: this.userKeys.publicKey,
          signing_public_key: this.userKeys.signingPublicKey,
          encrypted_private_keys: JSON.stringify(this.userKeys.encryptedData),
          device_id: this.deviceId,
          device_name: navigator.userAgent,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to setup keys on server:', error);
      return false;
    }
  }

  // Get recipient's public key
  async getRecipientPublicKey(recipientId: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/e2e/public-keys/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success ? result.data.public_key : null;
    } catch (error) {
      console.error('Failed to get recipient public key:', error);
      return null;
    }
  }

  // Get recipient's signing public key
  async getRecipientSigningPublicKey(recipientId: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/e2e/public-keys/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success ? result.data.signing_public_key : null;
    } catch (error) {
      console.error('Failed to get recipient signing public key:', error);
      return null;
    }
  }

  // Encrypt message for recipient
  async encryptMessage(content: string, recipientPublicKey: string, recipientSigningKey: string): Promise<{
    encryptedContent: string;
    encryptionMetadata: any;
  }> {
    if (!this.userKeys) {
      throw new Error('Keys not initialized');
    }

    try {
      const encryptedData = await E2EEncryption.encryptMessage(
        content,
        recipientPublicKey,
        this.userKeys.privateKey,
        recipientSigningKey,
        this.userKeys.signingPrivateKey
      );

      return {
        encryptedContent: encryptedData.encryptedContent,
        encryptionMetadata: {
          ephemeralPublicKey: encryptedData.ephemeralPublicKey,
          signature: encryptedData.signature,
          nonce: encryptedData.nonce,
          timestamp: encryptedData.timestamp,
          algorithm: 'ECDH-P384-AES-GCM',
          version: '1.0',
        },
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt received message
  async decryptMessage(
    encryptedContent: string,
    encryptionMetadata: any,
    senderPublicKey: string,
    senderSigningKey: string
  ): Promise<string> {
    if (!this.userKeys) {
      throw new Error('Keys not initialized');
    }

    try {
      const decryptedContent = await E2EEncryption.decryptMessage(
        encryptedContent,
        encryptionMetadata.ephemeralPublicKey,
        this.userKeys.privateKey,
        senderPublicKey,
        encryptionMetadata.signature,
        senderSigningKey,
        this.userKeys.signingPublicKey,
        encryptionMetadata.nonce,
        encryptionMetadata.timestamp
      );

      return decryptedContent;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Send encrypted direct message
  async sendEncryptedDirectMessage(
    recipientId: string,
    content: string,
    token: string
  ): Promise<boolean> {
    try {
      // Get recipient's public keys
      const recipientPublicKey = await this.getRecipientPublicKey(recipientId, token);
      const recipientSigningKey = await this.getRecipientSigningPublicKey(recipientId, token);
      
      if (!recipientPublicKey || !recipientSigningKey) {
        throw new Error('Recipient public keys not found');
      }

      // Encrypt the message
      const { encryptedContent, encryptionMetadata } = await this.encryptMessage(
        content,
        recipientPublicKey,
        recipientSigningKey
      );

      // Send encrypted message
      const response = await fetch('/api/messages/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          encrypted_content: encryptedContent,
          encryption_metadata: encryptionMetadata,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to send encrypted direct message:', error);
      return false;
    }
  }

  // Check if keys are initialized
  hasKeys(): boolean {
    return this.userKeys !== null;
  }

  // Clear keys from memory and storage
  clearKeys(): void {
    this.userKeys = null;
    localStorage.removeItem('e2e_public_key');
    localStorage.removeItem('e2e_signing_public_key');
    localStorage.removeItem('e2e_encrypted_data');
  }
}

export default new E2ECryptoService();
