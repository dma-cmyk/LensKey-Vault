const ITERATIONS = 100000;
const KEY_LEN = 256;
const ALGO = 'AES-GCM';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

async function getDerivedKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(text: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await getDerivedKey(password, salt);
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    data
  );
  
  const payload: EncryptedPayload = {
    ciphertext: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer)
  };
  
  return JSON.stringify(payload);
}

export async function decryptData(encryptedJson: string, password: string): Promise<string> {
  const payload: EncryptedPayload = JSON.parse(encryptedJson);
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
  
  const key = await getDerivedKey(password, salt);
  
  try {
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    throw new Error('Decryption failed. Incorrect password?');
  }
}
