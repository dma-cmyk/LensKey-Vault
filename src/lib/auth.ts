/**
 * Simple WebAuthn implementation for biometric gating.
 * This implementation uses the presence of a credential as a trigger
 * to "unlock" a password stored in IndexedDB/LocalStorage.
 * 
 * Each vault item gets its own biometric credential keyed by item ID,
 * with a display name for easy identification.
 */

const LEGACY_AUTH_ITEM_ID = 'master-biometric-credential';

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

  const options: PublicKeyCredentialCreationOptions = {
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
    timeout: 60000
  };

  const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential | null;

  if (credential) {
    const storageKey = itemId ? `bio_pass_${itemId}` : `bio_pass_${LEGACY_AUTH_ITEM_ID}`;
    localStorage.setItem(storageKey, password);
    
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

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000,
    ...(allowCredentials.length > 0 ? { allowCredentials } : {})
  };

  const assertion = await navigator.credentials.get({ publicKey: options });

  if (assertion) {
    // Try item-specific key first, then fall back to legacy global key
    const storageKey = itemId ? `bio_pass_${itemId}` : `bio_pass_${LEGACY_AUTH_ITEM_ID}`;
    const password = localStorage.getItem(storageKey)
      || localStorage.getItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
    if (password) return password;
    throw new Error('No password found for this biometric credential');
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
    localStorage.removeItem(`bio_name_${itemId}`);
    localStorage.removeItem(`bio_cred_${itemId}`);
  } else {
    localStorage.removeItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
    localStorage.removeItem(`bio_cred_${LEGACY_AUTH_ITEM_ID}`);
  }
}

