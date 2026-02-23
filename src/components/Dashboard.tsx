import { useState, useEffect } from 'react';
import { db, type VaultItem } from '../lib/db';
import { Button, Card, CATEGORIES, Badge, type Category } from './UIParts';
import { Plus, Scan, Wallet, Shield, ExternalLink, Trash2, Clock } from 'lucide-react';

interface DashboardProps {
  onAddNew: () => void;
  onScan: () => void;
  onSelectItem: (item: VaultItem) => void;
}

export function Dashboard({ onAddNew, onScan, onSelectItem }: DashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filter, setFilter] = useState<Category | 'すべて'>('すべて');

  useEffect(() => {
    const fetchItems = async () => {
      const data = await db.vault_items.toArray();
      setItems(data);
    };
    fetchItems();
  }, []);

  const filteredItems = filter === 'すべて' 
    ? items 
    : items.filter(i => i.category === filter);

  const deleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('このアイテムを削除しますか？物理的なQRコードがない限り復旧できません。')) {
      await db.vault_items.delete(id);
      setItems(items.filter(i => i.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Vault Dashboard</h1>
          <p className="text-zinc-400 mt-1">セキュアに管理されたあなたのシードフレーズ</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onScan}>
            <Scan className="w-4 h-4" />
            QRスキャン復元
          </Button>
          <Button onClick={onAddNew}>
            <Plus className="w-4 h-4" />
            新規追加
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button 
          onClick={() => setFilter('すべて')}
          className="shrink-0"
        >
          <Badge active={filter === 'すべて'}>すべて</Badge>
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setFilter(cat)}
            className="shrink-0"
          >
            <Badge active={filter === cat}>{cat}</Badge>
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed bg-transparent">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
            <Shield className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-medium text-zinc-300">アイテムが見つかりません</h3>
          <p className="text-zinc-500 mt-2 mb-6">新しいシードフレーズを登録するか、QRコードから読み込んでください。</p>
          <Button onClick={onAddNew} className="mx-auto">
            最初のアイテムを追加
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card 
              key={item.id} 
              className="group cursor-pointer hover:border-blue-500/50 transition-all hover:bg-zinc-900/50"
            >
              <div className="p-5 flex flex-col h-full" onClick={() => onSelectItem(item)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <Badge>{item.category}</Badge>
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-100 mb-1 group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
                
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>

                <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between">
                  {item.hasBiometrics && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Bio Protected
                    </span>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button 
                      onClick={(e) => deleteItem(e, item.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-zinc-600 group-hover:text-blue-400 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
