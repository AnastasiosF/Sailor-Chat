// Browser-compatible E2E encryption service
export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

class BrowserE2ECryptoService {
  private userKeys: EncryptionKeys | null = null;
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate ECDH key pair
  private async generateECDHKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      true,
      ['deriveKey']
    );
  }

  // Generate ECDSA key pair for signing
  private async generateECDSAKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-384'
      },
      true,
      ['sign', 'verify']
    );
  }

  // Export key to base64
  private async exportKeyToBase64(key: CryptoKey, format: 'spki' | 'pkcs8'): Promise<string> {
    const exported = await window.crypto.subtle.exportKey(format, key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  // Import key from base64
  private async importKeyFromBase64(
    keyData: string, 
    format: 'spki' | 'pkcs8',
    algorithm: any,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    const binaryString = atob(keyData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return await window.crypto.subtle.importKey(
      format,
      bytes.buffer,
      algorithm,
      extractable,
      keyUsages
    );
  }

  // Generate and setup keys (simplified version for browser)
  async generateKeys(): Promise<EncryptionKeys> {
    try {
      // Generate ECDH and signing key pairs
      const ecdhKeyPair = await this.generateECDHKeyPair();
      const ecdsaKeyPair = await this.generateECDSAKeyPair();
      
      // Export keys to base64
      const publicKey = await this.exportKeyToBase64(ecdhKeyPair.publicKey, 'spki');
      const privateKey = await this.exportKeyToBase64(ecdhKeyPair.privateKey, 'pkcs8');
      const signingPublicKey = await this.exportKeyToBase64(ecdsaKeyPair.publicKey, 'spki');
      const signingPrivateKey = await this.exportKeyToBase64(ecdsaKeyPair.privateKey, 'pkcs8');
      
      const keys: EncryptionKeys = {
        publicKey,
        privateKey,
        signingPublicKey,
        signingPrivateKey,
      };
      
      this.userKeys = keys;
      
      // Store in localStorage for now (in production, use secure storage)
      localStorage.setItem('browser_e2e_keys', JSON.stringify(keys));
      
      return keys;
    } catch (error) {
      console.error('Failed to generate encryption keys:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  // Load keys from storage
  loadKeys(): boolean {
    try {
      const keysStr = localStorage.getItem('browser_e2e_keys');
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
      // For now, use a default password and simple encryption
      const password = 'default-password'; // In production, this should be user's password
      const salt = btoa(crypto.getRandomValues(new Uint8Array(16)).join(','));
      const nonce = btoa(crypto.getRandomValues(new Uint8Array(12)).join(','));
      
      // Simple "encryption" of private keys (in production, use proper PBKDF2 + AES)
      const encryptedPrivateKeys = btoa(JSON.stringify({
        privateKey: this.userKeys.privateKey,
        signingPrivateKey: this.userKeys.signingPrivateKey
      }));

      const response = await fetch(`${API_BASE_URL}/e2e/setup-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          public_key_encryption: this.userKeys.publicKey,
          public_key_signing: this.userKeys.signingPublicKey,
          encrypted_private_keys: encryptedPrivateKeys,
          salt,
          nonce,
          password
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

  // Send plain text direct message (for now, we'll add encryption later)
  async sendDirectMessage(
    recipientId: string,
    content: string,
    token: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/direct`, {
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
      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
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
    localStorage.removeItem('browser_e2e_keys');
  }
}

export default new BrowserE2ECryptoService();
