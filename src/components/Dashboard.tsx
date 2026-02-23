import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db, type VaultItem } from '../lib/db';
import { Button, Card, DEFAULT_CATEGORIES, Badge, cn, Modal, ConfirmModal } from './UIParts';
import { Plus, QrCode, Trash2, ChevronRight, ChevronDown, Fingerprint, Lock, Settings2, GripVertical, Tag } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableBadge({ id, active, onClick }: { id: string; active: boolean; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn("touch-none", isDragging && "scale-105 transition-transform")}
    >
      <Badge active={active} onClick={onClick}>
        {id}
      </Badge>
    </div>
  );
}


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
  const [showManageModal, setShowManageModal] = useState(false);
  const [deleteTask, setDeleteTask] = useState<{ type: 'item' | 'category', id: string, name?: string } | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [changeCategoryItemId, setChangeCategoryItemId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const categoryPopoverRef = useRef<HTMLDivElement>(null);

  const openCategoryPopover = useCallback((itemId: string, badgeEl: HTMLElement) => {
    if (changeCategoryItemId === itemId) {
      setChangeCategoryItemId(null);
      setPopoverPos(null);
      return;
    }
    const rect = badgeEl.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    setChangeCategoryItemId(itemId);
  }, [changeCategoryItemId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    db.vault_items.toArray().then(setItems);
    const fetchCategories = async () => {
      const existing = await db.categories.orderBy('order').toArray();
      if (existing.length === 0) {
        const initial = DEFAULT_CATEGORIES.map((name, i) => ({
          name,
          order: i,
          createdAt: new Date().toISOString()
        }));
        await db.categories.bulkAdd(initial);
        setCategories(DEFAULT_CATEGORIES as any);
      } else {
        setCategories(existing.map(c => c.name));
      }
    };
    fetchCategories();
  }, []);

  // Close category popover on outside click
  useEffect(() => {
    if (!changeCategoryItemId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPopoverRef.current && !categoryPopoverRef.current.contains(e.target as Node)) {
        setChangeCategoryItemId(null);
        setPopoverPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [changeCategoryItemId]);

  const handleItemCategoryChange = async (itemId: string, newCategory: string) => {
    await db.vault_items.update(itemId, { category: newCategory });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, category: newCategory } : i));
    setChangeCategoryItemId(null);
    setPopoverPos(null);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    const name = newCategory.trim();
    const count = await db.categories.count();
    await db.categories.add({ 
      name, 
      createdAt: new Date().toISOString(),
      order: count
    });
    setCategories(prev => [...prev, name]);
    setNewCategory('');
  };

  const executeDelete = async () => {
    if (!deleteTask) return;

    if (deleteTask.type === 'category' && deleteTask.name) {
      await db.categories.delete(deleteTask.name);
      setCategories(prev => prev.filter(c => c !== deleteTask.name));
      if (filter === deleteTask.name) setFilter('すべて');
      
      const linkedItems = await db.vault_items.where('category').equals(deleteTask.name).toArray();
      for (const item of linkedItems) {
        await db.vault_items.update(item.id, { category: 'その他' });
      }
      db.vault_items.toArray().then(setItems);
    } else if (deleteTask.type === 'item') {
      await db.vault_items.delete(deleteTask.id);
      setItems(prev => prev.filter(i => i.id !== deleteTask.id));
    }
    setDeleteTask(null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.indexOf(active.id);
    const newIndex = categories.indexOf(over.id);

    const newCategories = [...categories];
    newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, active.id);
    
    setCategories(newCategories);

    for (let i = 0; i < newCategories.length; i++) {
      await db.categories.update(newCategories[i], { order: i });
    }
  };

  const filteredItems = filter === 'すべて'
    ? items
    : items.filter(i => i.category === filter);

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
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className={cn(
            "flex-1 flex flex-wrap gap-2 transition-all duration-300 overflow-hidden",
            !showAllCategories && "max-h-[44px]"
          )}>
            <Badge active={filter === 'すべて'} onClick={() => setFilter('すべて')}>すべて</Badge>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories} strategy={horizontalListSortingStrategy}>
                {categories.map(cat => (
                  <SortableBadge 
                    key={cat} 
                    id={cat} 
                    active={filter === cat} 
                    onClick={() => setFilter(cat)} 
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="flex items-center gap-1 shrink-0 pt-1">
            {categories.length > 3 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className={cn(
                  "p-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all",
                  showAllCategories && "text-blue-400 bg-blue-500/10 hover:text-blue-300"
                )}
                title={showAllCategories ? "折りたたむ" : "すべて表示"}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showAllCategories && "rotate-180")} />
              </button>
            )}
            <button 
              onClick={() => setShowManageModal(true)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
            <Lock className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-500 font-medium mb-1">アイテムがまだありません</p>
          <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
            新しい記録を追加するか、<br />バックアップQRをスキャンしてください
          </p>
          <Button onClick={onAddNew}>最初のアイテムを追加</Button>
        </div>
      ) : (
        <div className="space-y-3 pb-20">
          {filteredItems.map(item => (
            <Card key={item.id} onClick={() => onSelectItem(item)}>
              <div className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-zinc-100 truncate">{item.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryPopover(item.id, e.currentTarget);
                      }}
                      className={cn(
                        "flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight transition-all shrink-0",
                        changeCategoryItemId === item.id
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                          : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                      )}
                      title="カテゴリを変更"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {item.category}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.hasBiometrics && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Fingerprint className="w-3.5 h-3.5" />
                        生体認証
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTask({ type: 'item', id: item.id, name: item.title });
                    }}
                    className="p-2 text-zinc-700 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-800" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manage Categories Modal */}
      <Modal 
        isOpen={showManageModal} 
        onClose={() => setShowManageModal(false)} 
        title="カテゴリ管理"
      >
        <div className="space-y-6">
          <div className="flex gap-2 p-1">
            <input 
              type="text" 
              placeholder="新しいカテゴリ名"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory}>追加</Button>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-black px-1">
              カスタムカテゴリ（削除・並べ替え可）
            </label>
            <div className="grid grid-cols-1 gap-2 p-1 max-h-[40vh] overflow-y-auto no-scrollbar">
              {categories.filter(c => !DEFAULT_CATEGORIES.includes(c as any)).length === 0 ? (
                <p className="text-sm text-zinc-600 px-1 py-10 text-center bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
                  カスタムカテゴリはありません
                </p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={categories} strategy={horizontalListSortingStrategy}>
                    {categories.filter(c => !DEFAULT_CATEGORIES.includes(c as any)).map(cat => (
                      <div key={cat} className="flex items-center justify-between p-3 pl-4 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl group active:scale-[0.98] transition-transform">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />
                          <span className="text-sm font-semibold text-zinc-300">{cat}</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (DEFAULT_CATEGORIES.includes(cat as any)) {
                              alert('デフォルトカテゴリは削除できません。');
                              return;
                            }
                            setDeleteTask({ type: 'category', id: '', name: cat });
                          }}
                          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 px-1 pt-1 italic">
              ※ デフォルトカテゴリ（パスワード、メモ等）は削除できません。
            </p>
          </div>
        </div>
      </Modal>

      {/* Category Change Popover (Portal) */}
      {changeCategoryItemId && popoverPos && createPortal(
        <div
          ref={categoryPopoverRef}
          className="fixed z-[9999] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/40 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {categories.map(cat => {
            const targetItem = items.find(i => i.id === changeCategoryItemId);
            return (
              <button
                key={cat}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemCategoryChange(changeCategoryItemId, cat);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  cat === targetItem?.category
                    ? "text-blue-400 bg-blue-500/10 font-semibold"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={executeDelete}
        title={deleteTask?.type === 'item' ? "アイテムの削除" : "カテゴリの削除"}
        description={deleteTask?.type === 'item' 
          ? `「${deleteTask.name}」を削除してもよろしいですか？この操作は取り消せません。`
          : `カテゴリ「${deleteTask?.name}」を削除しますか？このカテゴリに属するアイテムのカテゴリ表示は「その他」に変更されます。`}
      />
    </div>
  );
}
