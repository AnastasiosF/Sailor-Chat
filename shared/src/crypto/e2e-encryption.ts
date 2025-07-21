/// <reference lib="dom" />

// Use Web Crypto API directly in browser, fallback to Node.js crypto in backend
const crypto = (() => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    return window.crypto;
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    // Node.js environment with webcrypto
    return globalThis.crypto;
  } else {
    // Fallback for Node.js
    try {
      const { webcrypto } = require('crypto');
      return webcrypto;
    } catch {
      throw new Error('Web Crypto API not available');
    }
  }
})();

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SerializedKeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
}

export interface EncryptedMessage {
  encryptedContent: string; // Base64 encoded
  ephemeralPublicKey: string; // Base64 encoded
  signature: string; // Base64 encoded
  nonce: string; // Base64 encoded
  timestamp: number;
}

export class E2EEncryption {
  private static readonly ALGORITHM = 'ECDH';
  private static readonly CURVE = 'P-384'; // NIST P-384 curve for highest security
  private static readonly HASH = 'SHA-384';
  private static readonly AES_ALGORITHM = 'AES-GCM';
  private static readonly AES_LENGTH = 256;
  private static readonly SIGNATURE_ALGORITHM = 'ECDSA';

  /**
   * Generate a new ECDH key pair for E2E encryption
   */
  public static async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE,
        },
        true, // extractable
        ['deriveKey']
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      };
    } catch (error) {
      throw new Error(`Failed to generate key pair: ${error}`);
    }
  }

  /**
   * Generate signing key pair for message authentication
   */
  public static async generateSigningKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: this.SIGNATURE_ALGORITHM,
          namedCurve: this.CURVE,
        },
        true, // extractable
        ['sign', 'verify']
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      };
    } catch (error) {
      throw new Error(`Failed to generate signing key pair: ${error}`);
    }
  }

  /**
   * Export key pair to base64 strings for storage
   */
  public static async serializeKeyPair(keyPair: KeyPair): Promise<SerializedKeyPair> {
    try {
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: this.arrayBufferToBase64(publicKeyBuffer),
        privateKey: this.arrayBufferToBase64(privateKeyBuffer),
      };
    } catch (error) {
      throw new Error(`Failed to serialize key pair: ${error}`);
    }
  }

  /**
   * Import key pair from base64 strings
   */
  public static async deserializeKeyPair(
    serialized: SerializedKeyPair,
    algorithm: string = this.ALGORITHM
  ): Promise<KeyPair> {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(serialized.publicKey);
      const privateKeyBuffer = this.base64ToArrayBuffer(serialized.privateKey);

      const usages = algorithm === this.ALGORITHM ? ['deriveKey'] : ['sign', 'verify'];

      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: algorithm,
          namedCurve: this.CURVE,
        },
        true,
        algorithm === this.ALGORITHM ? [] : ['verify']
      );

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: algorithm,
          namedCurve: this.CURVE,
        },
        true,
        algorithm === this.ALGORITHM ? ['deriveKey'] : ['sign']
      );

      return { publicKey, privateKey };
    } catch (error) {
      throw new Error(`Failed to deserialize key pair: ${error}`);
    }
  }

  /**
   * Derive shared secret using ECDH
   */
  private static async deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<CryptoKey> {
    try {
      return await crypto.subtle.deriveKey(
        {
          name: this.ALGORITHM,
          public: publicKey,
        },
        privateKey,
        {
          name: this.AES_ALGORITHM,
          length: this.AES_LENGTH,
        },
        false, // not extractable for security
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to derive shared secret: ${error}`);
    }
  }

  /**
   * Encrypt a message using ephemeral ECDH + AES-GCM + ECDSA signature
   */
  public static async encryptMessage(
    message: string,
    recipientPublicKey: string,
    senderPrivateKey: string,
    senderSigningPrivateKey: string
  ): Promise<EncryptedMessage> {
    try {
      // Generate ephemeral key pair for this message
      const ephemeralKeyPair = await this.generateKeyPair();
      
      // Import recipient's public key
      const recipientKey = await crypto.subtle.importKey(
        'spki',
        this.base64ToArrayBuffer(recipientPublicKey),
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        []
      );

      // Import sender's private key
      const senderKey = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(senderPrivateKey),
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        ['deriveKey']
      );

      // Derive shared secret using ephemeral private key and recipient's public key
      const sharedSecret = await this.deriveSharedSecret(ephemeralKeyPair.privateKey, recipientKey);

      // Generate random nonce
      const nonce = new Uint8Array(12);
      (crypto as any).getRandomValues(nonce);

      // Encrypt the message
      const messageBuffer = new TextEncoder().encode(message);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.AES_ALGORITHM,
          iv: nonce,
        },
        sharedSecret,
        messageBuffer
      );

      // Export ephemeral public key
      const ephemeralPublicKeyBuffer = await crypto.subtle.exportKey('spki', ephemeralKeyPair.publicKey);
      const ephemeralPublicKeyBase64 = this.arrayBufferToBase64(ephemeralPublicKeyBuffer);

      // Create signature data (ephemeral public key + encrypted content + nonce)
      const signatureData = new Uint8Array([
        ...new Uint8Array(ephemeralPublicKeyBuffer),
        ...new Uint8Array(encryptedBuffer),
        ...nonce
      ]);

      // Import signing key and create signature
      const signingKey = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(senderSigningPrivateKey),
        {
          name: this.SIGNATURE_ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        {
          name: this.SIGNATURE_ALGORITHM,
          hash: this.HASH,
        },
        signingKey,
        signatureData
      );

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedBuffer),
        ephemeralPublicKey: ephemeralPublicKeyBase64,
        signature: this.arrayBufferToBase64(signature),
        nonce: this.arrayBufferToBase64(nonce),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to encrypt message: ${error}`);
    }
  }

  /**
   * Decrypt a message using ECDH + AES-GCM and verify signature
   */
  public static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    recipientPrivateKey: string,
    senderPublicKey: string,
    senderSigningPublicKey: string
  ): Promise<string> {
    try {
      // Import recipient's private key
      const recipientKey = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(recipientPrivateKey),
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        ['deriveKey']
      );

      // Import ephemeral public key
      const ephemeralPublicKey = await crypto.subtle.importKey(
        'spki',
        this.base64ToArrayBuffer(encryptedMessage.ephemeralPublicKey),
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        []
      );

      // Derive shared secret
      const sharedSecret = await this.deriveSharedSecret(recipientKey, ephemeralPublicKey);

      // Verify signature first
      const ephemeralPublicKeyBuffer = this.base64ToArrayBuffer(encryptedMessage.ephemeralPublicKey);
      const encryptedContentBuffer = this.base64ToArrayBuffer(encryptedMessage.encryptedContent);
      const nonceBuffer = this.base64ToArrayBuffer(encryptedMessage.nonce);
      
      const signatureData = new Uint8Array([
        ...new Uint8Array(ephemeralPublicKeyBuffer),
        ...new Uint8Array(encryptedContentBuffer),
        ...new Uint8Array(nonceBuffer)
      ]);

      const verifyingKey = await crypto.subtle.importKey(
        'spki',
        this.base64ToArrayBuffer(senderSigningPublicKey),
        {
          name: this.SIGNATURE_ALGORITHM,
          namedCurve: this.CURVE,
        },
        false,
        ['verify']
      );

      const isSignatureValid = await crypto.subtle.verify(
        {
          name: this.SIGNATURE_ALGORITHM,
          hash: this.HASH,
        },
        verifyingKey,
        this.base64ToArrayBuffer(encryptedMessage.signature),
        signatureData
      );

      if (!isSignatureValid) {
        throw new Error('Message signature verification failed');
      }

      // Decrypt the message
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.AES_ALGORITHM,
          iv: this.base64ToArrayBuffer(encryptedMessage.nonce),
        },
        sharedSecret,
        this.base64ToArrayBuffer(encryptedMessage.encryptedContent)
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`Failed to decrypt message: ${error}`);
    }
  }

  /**
   * Generate a secure random salt
   */
  public static generateSalt(): string {
    const salt = new Uint8Array(32);
    (crypto as any).getRandomValues(salt);
    return this.arrayBufferToBase64(salt);
  }

  /**
   * Derive key from password using PBKDF2
   */
  public static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = 100000
  ): Promise<CryptoKey> {
    try {
      const passwordBuffer = new TextEncoder().encode(password);
      const saltBuffer = this.base64ToArrayBuffer(salt);

      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations,
          hash: this.HASH,
        },
        baseKey,
        {
          name: this.AES_ALGORITHM,
          length: this.AES_LENGTH,
        },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to derive key from password: ${error}`);
    }
  }

  /**
   * Encrypt private keys with password for secure storage
   */
  public static async encryptPrivateKeysWithPassword(
    serializedKeyPair: SerializedKeyPair,
    signingKeyPair: SerializedKeyPair,
    password: string
  ): Promise<{ encryptedKeys: string; salt: string; nonce: string }> {
    try {
      const salt = this.generateSalt();
      const derivedKey = await this.deriveKeyFromPassword(password, salt);
      
      const keysData = JSON.stringify({
        encryption: serializedKeyPair,
        signing: signingKeyPair,
      });

      const nonce = new Uint8Array(12);
      (crypto as any).getRandomValues(nonce);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.AES_ALGORITHM,
          iv: nonce,
        },
        derivedKey,
        new TextEncoder().encode(keysData)
      );

      return {
        encryptedKeys: this.arrayBufferToBase64(encryptedBuffer),
        salt,
        nonce: this.arrayBufferToBase64(nonce),
      };
    } catch (error) {
      throw new Error(`Failed to encrypt private keys: ${error}`);
    }
  }

  /**
   * Decrypt private keys with password
   */
  public static async decryptPrivateKeysWithPassword(
    encryptedKeys: string,
    salt: string,
    nonce: string,
    password: string
  ): Promise<{ encryption: SerializedKeyPair; signing: SerializedKeyPair }> {
    try {
      const derivedKey = await this.deriveKeyFromPassword(password, salt);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.AES_ALGORITHM,
          iv: this.base64ToArrayBuffer(nonce),
        },
        derivedKey,
        this.base64ToArrayBuffer(encryptedKeys)
      );

      const keysData = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(keysData);
    } catch (error) {
      throw new Error(`Failed to decrypt private keys: ${error}`);
    }
  }

  // Utility methods
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default E2EEncryption;
