import { encryptData, decryptData } from './crypto';

const LEGACY_AUTH_ITEM_ID = 'master-biometric-credential';
const PRF_SALT = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
  0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20
]);

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function isWebAuthnAvailable(): Promise<boolean> {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
}

export async function registerBiometrics(password: string, itemId?: string, displayName?: string): Promise<void> {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userID = window.crypto.getRandomValues(new Uint8Array(16));
  const credName = displayName || 'Local User';

  const options: any = {
    challenge,
    rp: { name: 'LensKey Vault', id: window.location.hostname },
    user: {
      id: userID,
      name: credName,
      displayName: credName
    },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
      requireResidentKey: true
    },
    extensions: {
      prf: {
        eval: {
          first: PRF_SALT
        }
      }
    },
    timeout: 60000
  };

  const credential = await navigator.credentials.create({ publicKey: options }) as any;

  if (credential) {
    const storageKey = itemId ? `bio_pass_${itemId}` : `bio_pass_${LEGACY_AUTH_ITEM_ID}`;
    
    // Attempt to use PRF for encryption if available
    const prfResults = credential.getClientExtensionResults()?.prf;
    if (prfResults?.results?.first) {
      const prfKey = new Uint8Array(prfResults.results.first);
      const prfKeyHex = Array.from(prfKey).map(b => b.toString(16).padStart(2, '0')).join('');
      const encryptedPassword = await encryptData(password, prfKeyHex);
      localStorage.setItem(storageKey, encryptedPassword);
      localStorage.setItem(`${storageKey}_secure`, 'true');
    } else {
      // Fallback to legacy (though discouraged, we keep it for now but mark it)
      localStorage.setItem(storageKey, password);
      localStorage.removeItem(`${storageKey}_secure`);
    }
    
    // Store credential ID for allowCredentials filtering
    const credIdB64 = bufferToBase64(credential.rawId);
    if (itemId) {
      localStorage.setItem(`bio_cred_${itemId}`, credIdB64);
      if (displayName) {
        localStorage.setItem(`bio_name_${itemId}`, displayName);
      }
    } else {
      localStorage.setItem(`bio_cred_${LEGACY_AUTH_ITEM_ID}`, credIdB64);
    }
  } else {
    throw new Error('Biometric registration failed');
  }
}

export async function verifyBiometrics(itemId?: string): Promise<string> {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  // Build allowCredentials to show only the relevant passkey in the picker
  const allowCredentials: PublicKeyCredentialDescriptor[] = [];
  const credKey = itemId ? `bio_cred_${itemId}` : `bio_cred_${LEGACY_AUTH_ITEM_ID}`;
  const credIdB64 = localStorage.getItem(credKey);
  
  if (credIdB64) {
    allowCredentials.push({
      type: 'public-key',
      id: base64ToBuffer(credIdB64),
      transports: ['internal']
    });
  }
  // Also try legacy credential if it exists
  if (itemId) {
    const legacyCred = localStorage.getItem(`bio_cred_${LEGACY_AUTH_ITEM_ID}`);
    if (legacyCred && legacyCred !== credIdB64) {
      allowCredentials.push({
        type: 'public-key',
        id: base64ToBuffer(legacyCred),
        transports: ['internal']
      });
    }
  }

  const options: any = {
    challenge,
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000,
    extensions: {
      prf: {
        eval: {
          first: PRF_SALT
        }
      }
    },
    ...(allowCredentials.length > 0 ? { allowCredentials } : {})
  };

  const assertion = await navigator.credentials.get({ publicKey: options }) as any;

  if (assertion) {
    const storageKey = itemId ? `bio_pass_${itemId}` : `bio_pass_${LEGACY_AUTH_ITEM_ID}`;
    const storedValue = localStorage.getItem(storageKey)
      || localStorage.getItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
    
    if (!storedValue) throw new Error('No password found for this biometric credential');

    const isSecure = localStorage.getItem(`${storageKey}_secure`) === 'true' 
      || localStorage.getItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}_secure`) === 'true';

    if (isSecure) {
      const prfResults = assertion.getClientExtensionResults()?.prf;
      if (prfResults?.results?.first) {
        const prfKey = new Uint8Array(prfResults.results.first);
        const prfKeyHex = Array.from(prfKey).map(b => b.toString(16).padStart(2, '0')).join('');
        return await decryptData(storedValue, prfKeyHex);
      } else {
        throw new Error('Secure biometric unlock failed: PRF not available');
      }
    } else {
      // Legacy plaintext password migration
      const password = storedValue;
      
      // AUTO-MIGRATION: If PRF is available, upgrade to secure storage
      const prfResults = assertion.getClientExtensionResults()?.prf;
      if (prfResults?.results?.first) {
        try {
          const prfKey = new Uint8Array(prfResults.results.first);
          const prfKeyHex = Array.from(prfKey).map(b => b.toString(16).padStart(2, '0')).join('');
          const encryptedPassword = await encryptData(password, prfKeyHex);
          localStorage.setItem(storageKey, encryptedPassword);
          localStorage.setItem(`${storageKey}_secure`, 'true');
          console.log('Biometric credential automatically upgraded to secure storage');
        } catch (e) {
          console.error('Failed to auto-upgrade biometric storage:', e);
        }
      }
      
      return password;
    }
  } else {
    throw new Error('Biometric verification failed');
  }
}

export function getBiometricName(itemId: string): string | null {
  return localStorage.getItem(`bio_name_${itemId}`);
}

export function hasBiometricsRegistered(itemId?: string): boolean {
  if (itemId) {
    return !!localStorage.getItem(`bio_pass_${itemId}`)
      || !!localStorage.getItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
  }
  return !!localStorage.getItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
}

export function clearBiometrics(itemId?: string): void {
  if (itemId) {
    localStorage.removeItem(`bio_pass_${itemId}`);
    localStorage.removeItem(`bio_pass_${itemId}_secure`);
    localStorage.removeItem(`bio_name_${itemId}`);
    localStorage.removeItem(`bio_cred_${itemId}`);
  } else {
    localStorage.removeItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
    localStorage.removeItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}_secure`);
    localStorage.removeItem(`bio_cred_${LEGACY_AUTH_ITEM_ID}`);
  }
}

