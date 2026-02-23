/**
 * Simple WebAuthn implementation for biometric gating.
 * This implementation uses the presence of a credential as a trigger
 * to "unlock" a password stored in IndexedDB/LocalStorage.
 * For a real production app, PRF extension or server-side verification would be used.
 */

const AUTH_ITEM_ID = 'master-biometric-credential';

export async function isWebAuthnAvailable(): Promise<boolean> {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
}

export async function registerBiometrics(password: string): Promise<void> {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userID = window.crypto.getRandomValues(new Uint8Array(16));

  const options: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: 'Hybrid Seed Vault', id: window.location.hostname },
    user: {
      id: userID,
      name: 'user@local',
      displayName: 'Local User'
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
    // Store the password associated with biometrics. 
    // In this simple implementation, we store it in LocalStorage (not ideal for prod, but matches requirement).
    // We'll prefix it to distinguish it from other items.
    localStorage.setItem(`bio_pass_${AUTH_ITEM_ID}`, password);
  } else {
    throw new Error('Biometric registration failed');
  }
}

export async function verifyBiometrics(): Promise<string> {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({ publicKey: options });

  if (assertion) {
    const password = localStorage.getItem(`bio_pass_${AUTH_ITEM_ID}`);
    if (password) return password;
    throw new Error('No password found for this biometric credential');
  } else {
    throw new Error('Biometric verification failed');
  }
}

export function hasBiometricsRegistered(): boolean {
  return !!localStorage.getItem(`bio_pass_${AUTH_ITEM_ID}`);
}

export function clearBiometrics(): void {
  localStorage.removeItem(`bio_pass_${AUTH_ITEM_ID}`);
}
