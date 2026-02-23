import { useState, useEffect } from 'react';
import { db, type VaultItem } from '../lib/db';
import { Button, Card, DEFAULT_CATEGORIES, Badge, cn } from './UIParts';
import { Plus, QrCode, Trash2, ChevronRight, Fingerprint, Lock, Settings2 } from 'lucide-react';

interface DashboardProps {
  onAddNew: () => void;
  onScan: () => void;
  onSelectItem: (item: VaultItem) => void;
}

export function Dashboard({ onAddNew, onScan, onSelectItem }: DashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('すべて');
  const [newCategory, setNewCategory] = useState('');
  const [showCatSettings, setShowCatSettings] = useState(false);

  useEffect(() => {
    db.vault_items.toArray().then(setItems);
    db.categories.toArray().then(cats => {
      const dbCats = cats.map(c => c.name);
      setCategories([...new Set([...DEFAULT_CATEGORIES, ...dbCats])]);
    });
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    const name = newCategory.trim();
    await db.categories.add({ name, createdAt: new Date().toISOString() });
    setCategories(prev => [...prev, name]);
    setNewCategory('');
  };

  const handleDeleteCategory = async (name: string) => {
    if (confirm(`カテゴリ「${name}」を削除しますか？\nこのカテゴリに属するアイテムは削除されませんが、カテゴリ表示が「その他」になります。`)) {
      await db.categories.delete(name);
      setCategories(prev => prev.filter(c => c !== name));
      if (filter === name) setFilter('すべて');
      
      // Update existing items in background (optional, but good for UI consistency)
      const linkedItems = await db.vault_items.where('category').equals(name).toArray();
      for (const item of linkedItems) {
        await db.vault_items.update(item.id, { category: 'その他' });
      }
      db.vault_items.toArray().then(setItems);
    }
  };

  const filteredItems = filter === 'すべて'
    ? items
    : items.filter(i => i.category === filter);

  const deleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('このアイテムを削除しますか？\n物理的なQRコードがない限り復元できません。')) {
      await db.vault_items.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onAddNew} size="lg" className="w-full">
          <Plus className="w-4 h-4" />
          新規追加
        </Button>
        <Button onClick={onScan} variant="secondary" size="lg" className="w-full">
          <QrCode className="w-4 h-4" />
          QRから復元
        </Button>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <Badge active={filter === 'すべて'} onClick={() => setFilter('すべて')}>すべて</Badge>
            {categories.map(cat => (
              <Badge key={cat} active={filter === cat} onClick={() => setFilter(cat)}>{cat}</Badge>
            ))}
          </div>
          <button 
            onClick={() => setShowCatSettings(!showCatSettings)}
            className={cn("p-2 rounded-lg transition-colors", showCatSettings ? "text-blue-400 bg-blue-500/10" : "text-zinc-600 hover:text-zinc-400")}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {showCatSettings && (
          <div className="space-y-4 pt-2 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="新しいカテゴリ名"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <Button size="sm" onClick={handleAddCategory}>追加</Button>
            </div>

            {/* Custom Category List */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-1">カスタムカテゴリ</label>
              <div className="grid grid-cols-1 gap-1.5">
                {categories.filter(c => !DEFAULT_CATEGORIES.includes(c as any)).length === 0 ? (
                  <p className="text-xs text-zinc-600 px-1 italic">カスタムカテゴリはありません</p>
                ) : (
                  categories.filter(c => !DEFAULT_CATEGORIES.includes(c as any)).map(cat => (
                    <div key={cat} className="flex items-center justify-between p-2 pl-3 bg-zinc-900 border border-zinc-800 rounded-lg group">
                      <span className="text-sm text-zinc-300">{cat}</span>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
            <Lock className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-500 font-medium mb-1">アイテムがまだありません</p>
          <p className="text-zinc-600 text-sm mb-6">
            シードフレーズを追加するか、<br />バックアップQRをスキャンしてください
          </p>
          <Button onClick={onAddNew}>最初のアイテムを追加</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} onClick={() => onSelectItem(item)}>
              <div className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-zinc-100 truncate">{item.title}</h3>
                    <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.hasBiometrics && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Fingerprint className="w-3 h-3" />
                        生体認証
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => deleteItem(e, item.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-700" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
