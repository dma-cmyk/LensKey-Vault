import { useState, useEffect } from 'react';
import { db, type VaultItem } from '../lib/db';
import { Button, Card, CATEGORIES, Badge, SectionHeader, type Category } from './UIParts';
import { Plus, Scan, Wallet, Shield, ExternalLink, Trash2, Clock, ChevronRight } from 'lucide-react';

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
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <SectionHeader 
          title="Vault Dashboard" 
          subtitle="セキュアに管理されたあなたのシードフレーズ"
        />
        <div className="flex gap-4">
          <Button variant="glass" onClick={onScan} className="flex-1 sm:flex-none">
            <Scan className="w-4 h-4 text-zinc-400" />
            QRから復元
          </Button>
          <Button onClick={onAddNew} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4" />
            新規追加
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
        <button onClick={() => setFilter('すべて')} className="shrink-0 transition-transform active:scale-95">
          <Badge active={filter === 'すべて'}>すべて</Badge>
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className="shrink-0 transition-transform active:scale-95">
            <Badge active={filter === cat}>{cat}</Badge>
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-20 text-center animate-in zoom-in-95 duration-500">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
            <div className="relative w-full h-full glass-panel flex items-center justify-center rounded-[2rem]">
              <Shield className="w-10 h-10 text-zinc-700" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white mb-3 font-display">アイテムがまだありません</h3>
          <p className="text-zinc-500 text-lg max-w-md mx-auto mb-10">
            登録されたシードフレーズがありません。<br />新しく追加するか、バックアップQRをスキャンしてください。
          </p>
          <Button onClick={onAddNew} size="lg" className="mx-auto px-10">
            最初のアイテムを追加
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map(item => (
            <Card 
              key={item.id} 
              className="group cursor-pointer border border-white/[0.05]"
            >
              <div className="p-8 flex flex-col h-full" onClick={() => onSelectItem(item)}>
                <div className="flex items-start justify-between mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-14 h-14 glass-panel flex items-center justify-center rounded-2xl group-hover:border-blue-500/50 transition-colors">
                      <Wallet className="w-7 h-7 text-white/40 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                  <Badge>{item.category}</Badge>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 font-display group-hover:text-blue-400 transition-colors flex items-center justify-between">
                  {item.title}
                  <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                </h3>
                
                <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-8">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>

                <div className="mt-auto pt-6 border-t border-white/[0.05] flex items-center justify-between">
                  {item.hasBiometrics ? (
                    <div className="flex items-center gap-2 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80">
                        Biometric Secured
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-zinc-500/5 px-2.5 py-1 rounded-lg border border-zinc-500/10">
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-zinc-600">
                        Password Only
                      </span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => deleteItem(e, item.id)}
                      className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 text-zinc-600 group-hover:text-blue-400 group-hover:bg-blue-400/5 rounded-xl transition-all">
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
