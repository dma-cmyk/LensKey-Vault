import { useState, useEffect } from 'react';
import { db, type VaultItem } from '../lib/db';
import { Button, Card, CATEGORIES, Badge, type Category } from './UIParts';
import { Plus, QrCode, Trash2, ChevronRight, Fingerprint, Lock } from 'lucide-react';

interface DashboardProps {
  onAddNew: () => void;
  onScan: () => void;
  onSelectItem: (item: VaultItem) => void;
}

export function Dashboard({ onAddNew, onScan, onSelectItem }: DashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filter, setFilter] = useState<Category | 'すべて'>('すべて');

  useEffect(() => {
    db.vault_items.toArray().then(setItems);
  }, []);

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
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <Badge active={filter === 'すべて'} onClick={() => setFilter('すべて')}>すべて</Badge>
        {CATEGORIES.map(cat => (
          <Badge key={cat} active={filter === cat} onClick={() => setFilter(cat)}>{cat}</Badge>
        ))}
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
