import Dexie, { type Table } from 'dexie';

export interface VaultItem {
  id: string;
  title: string;
  category: string;
  encryptedData: string; // JSON string containing salt, iv, and ciphertext
  createdAt: string;
  hasBiometrics: boolean;
}

export interface CategoryItem {
  name: string;
  createdAt: string;
  order: number;
}

export class VaultDatabase extends Dexie {
  vault_items!: Table<VaultItem>;
  categories!: Table<CategoryItem>;

  constructor() {
    super('HybridSeedVault');
    this.version(3).stores({
      vault_items: 'id, title, category, createdAt',
      categories: 'name, order'
    });
  }
}

export const db = new VaultDatabase();
