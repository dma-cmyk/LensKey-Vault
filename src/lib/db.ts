import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from './crypto';

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

export interface BackupData {
  vault_items: VaultItem[];
  categories: CategoryItem[];
  exportedAt: string;
}

export const exportData = async (password?: string): Promise<string> => {
  const items = await db.vault_items.toArray();
  const categories = await db.categories.toArray();
  const backup: BackupData = {
    vault_items: items,
    categories: categories,
    exportedAt: new Date().toISOString()
  };
  
  const json = JSON.stringify(backup, null, 2);
  
  if (password) {
    const encrypted = await encryptData(json, password);
    return JSON.stringify({
      version: 2,
      encrypted: true,
      data: encrypted
    });
  }
  
  return json;
};

export const importData = async (jsonString: string, password?: string): Promise<{ count: number }> => {
  let data: BackupData;
  const parsed = JSON.parse(jsonString);

  if (parsed.encrypted && parsed.data) {
    if (!password) {
      throw new Error('PASSWORD_REQUIRED');
    }
    const decrypted = await decryptData(parsed.data, password);
    data = JSON.parse(decrypted);
  } else {
    data = parsed;
  }
  
  if (!data.vault_items || !data.categories) {
    throw new Error('Invalid backup file format');
  }

  return await db.transaction('rw', db.vault_items, db.categories, async () => {
    // Clear existing data? Let's append but check for duplicates by ID
    // Actually, usually a restore should merge or replace. Let's merge by ID.
    for (const item of data.vault_items) {
      await db.vault_items.put(item);
    }
    for (const category of data.categories) {
      await db.categories.put(category);
    }
    return { count: data.vault_items.length };
  });
};
