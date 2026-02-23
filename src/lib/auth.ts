/**
 * Simple WebAuthn implementation for biometric gating.
 * This implementation uses the presence of a credential as a trigger
 * to "unlock" a password stored in IndexedDB/LocalStorage.
 * 
 * Each vault item gets its own biometric credential keyed by item ID,
 * with a display name for easy identification.
 */

const LEGACY_AUTH_ITEM_ID = 'master-biometric-credential';

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
      userVerification: 'required'
    },
    timeout: 60000
  };

  const credential = await window.crypto.subtle && await navigator.credentials.create({ publicKey: options });

  if (credential) {
    const storageKey = itemId ? `bio_pass_${itemId}` : `bio_pass_${LEGACY_AUTH_ITEM_ID}`;
    localStorage.setItem(storageKey, password);
    // Store display name for the credential
    if (itemId && displayName) {
      localStorage.setItem(`bio_name_${itemId}`, displayName);
    }
  } else {
    throw new Error('Biometric registration failed');
  }
}

export async function verifyBiometrics(itemId?: string): Promise<string> {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000
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
  } else {
    localStorage.removeItem(`bio_pass_${LEGACY_AUTH_ITEM_ID}`);
  }
}
