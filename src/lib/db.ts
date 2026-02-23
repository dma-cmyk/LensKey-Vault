import Dexie, { type Table } from 'dexie';

export interface VaultItem {
  id: string;
  title: string;
  category: string;
  encryptedData: string; // JSON string containing salt, iv, and ciphertext
  createdAt: string;
  hasBiometrics: boolean;
}

export class VaultDatabase extends Dexie {
  vault_items!: Table<VaultItem>;

  constructor() {
    super('HybridSeedVault');
    this.version(1).stores({
      vault_items: 'id, title, category, createdAt'
    });
  }
}

export const db = new VaultDatabase();
