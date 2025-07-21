import { E2EEncryption } from '../../shared/src/crypto/e2e-encryption';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  encryptedPrivateKey: string;
}

export interface DirectMessageData {
  recipientId: string;
  content?: string;
  encryptedContent?: string;
  encryptionMetadata?: any;
}

class E2ECryptoService {
  private encryption: E2EEncryption;
  private userKeys: EncryptionKeys | null = null;
  private deviceId: string;

  constructor() {
    this.encryption = new E2EEncryption();
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize user's encryption keys
  async initializeKeys(password: string): Promise<EncryptionKeys> {
    try {
      const keys = await this.encryption.generateUserKeys(password);
      this.userKeys = keys;
      
      // Store keys securely (consider using secure storage)
      localStorage.setItem('e2e_public_key', keys.publicKey);
      localStorage.setItem('e2e_encrypted_private_key', keys.encryptedPrivateKey);
      
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
      const encryptedPrivateKey = localStorage.getItem('e2e_encrypted_private_key');
      
      if (!publicKey || !encryptedPrivateKey) {
        return false;
      }

      const privateKey = await this.encryption.decryptPrivateKey(encryptedPrivateKey, password);
      
      this.userKeys = {
        publicKey,
        privateKey,
        encryptedPrivateKey,
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
          encrypted_private_key: this.userKeys.encryptedPrivateKey,
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

  // Encrypt message for recipient
  async encryptMessage(content: string, recipientPublicKey: string): Promise<{
    encryptedContent: string;
    encryptionMetadata: any;
  }> {
    if (!this.userKeys) {
      throw new Error('Keys not initialized');
    }

    try {
      const encryptedData = await this.encryption.encryptMessage(
        content,
        recipientPublicKey,
        this.userKeys.privateKey
      );

      return {
        encryptedContent: encryptedData.encryptedMessage,
        encryptionMetadata: {
          ephemeralPublicKey: encryptedData.ephemeralPublicKey,
          signature: encryptedData.signature,
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
    senderPublicKey: string
  ): Promise<string> {
    if (!this.userKeys) {
      throw new Error('Keys not initialized');
    }

    try {
      const decryptedContent = await this.encryption.decryptMessage(
        encryptedContent,
        encryptionMetadata.ephemeralPublicKey,
        this.userKeys.privateKey,
        senderPublicKey,
        encryptionMetadata.signature
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
      // Get recipient's public key
      const recipientPublicKey = await this.getRecipientPublicKey(recipientId, token);
      if (!recipientPublicKey) {
        throw new Error('Recipient public key not found');
      }

      // Encrypt the message
      const { encryptedContent, encryptionMetadata } = await this.encryptMessage(
        content,
        recipientPublicKey
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
    localStorage.removeItem('e2e_encrypted_private_key');
  }
}

export default new E2ECryptoService();
