import { E2EEncryption } from '../../../shared/src/crypto/e2e-encryption';

export interface SimpleEncryptionKeys {
  publicKey: string;
  privateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
}

class SimpleE2ECryptoService {
  private userKeys: SimpleEncryptionKeys | null = null;
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate and setup keys (simplified version)
  async generateKeys(): Promise<SimpleEncryptionKeys> {
    try {
      // Generate ECDH and signing key pairs
      const keyPair = await E2EEncryption.generateKeyPair();
      const signingKeyPair = await E2EEncryption.generateSigningKeyPair();
      
      // Serialize keys
      const serializedKeys = await E2EEncryption.serializeKeyPair(keyPair);
      const serializedSigningKeys = await E2EEncryption.serializeKeyPair(signingKeyPair);
      
      const keys: SimpleEncryptionKeys = {
        publicKey: serializedKeys.publicKey,
        privateKey: serializedKeys.privateKey,
        signingPublicKey: serializedSigningKeys.publicKey,
        signingPrivateKey: serializedSigningKeys.privateKey,
      };
      
      this.userKeys = keys;
      
      // Store in localStorage for now (in production, use secure storage)
      localStorage.setItem('simple_e2e_keys', JSON.stringify(keys));
      
      return keys;
    } catch (error) {
      console.error('Failed to generate encryption keys:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  // Load keys from storage
  loadKeys(): boolean {
    try {
      const keysStr = localStorage.getItem('simple_e2e_keys');
      if (!keysStr) {
        return false;
      }

      this.userKeys = JSON.parse(keysStr);
      return true;
    } catch (error) {
      console.error('Failed to load encryption keys:', error);
      return false;
    }
  }

  // Setup keys on the server (simplified)
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

  // Get recipient's public keys
  async getRecipientKeys(recipientId: string, token: string): Promise<{ publicKey: string; signingPublicKey: string } | null> {
    try {
      const response = await fetch(`/api/e2e/public-keys/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        return {
          publicKey: result.data.public_key,
          signingPublicKey: result.data.signing_public_key,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get recipient keys:', error);
      return null;
    }
  }

  // Send plain text direct message (for now)
  async sendDirectMessage(
    recipientId: string,
    content: string,
    token: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/messages/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          content: content,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to send direct message:', error);
      return false;
    }
  }

  // Get direct message conversations
  async getDirectMessageConversations(token: string): Promise<any[]> {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  // Check if keys are initialized
  hasKeys(): boolean {
    return this.userKeys !== null;
  }

  // Get user's public key
  getPublicKey(): string | null {
    return this.userKeys?.publicKey || null;
  }

  // Get user's signing public key
  getSigningPublicKey(): string | null {
    return this.userKeys?.signingPublicKey || null;
  }

  // Clear keys from memory and storage
  clearKeys(): void {
    this.userKeys = null;
    localStorage.removeItem('simple_e2e_keys');
  }
}

export default new SimpleE2ECryptoService();
