import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CreateItem } from './components/CreateItem';
import { Scanner } from './components/Scanner';
import { ItemView } from './components/ItemView';
import { type VaultItem } from './lib/db';
import { Shield, Lock } from 'lucide-react';
import { useInactivity } from './hooks/useInactivity';
import { verifyBiometrics } from './lib/auth';
import { Button } from './components/UIParts';

type View = 'dashboard' | 'create' | 'scan' | 'view';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Auto-lock after 2 minutes of inactivity
  useInactivity(() => {
    if (!isLocked) {
      setIsLocked(true);
      setSelectedItem(null);
      setCurrentView('dashboard');
    }
  }, 2 * 60 * 1000);

  const navigateTo = (view: View, item: VaultItem | null = null) => {
    if (isLocked) return;
    setSelectedItem(item);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemUpdated = (updatedItem: VaultItem) => {
    setSelectedItem(updatedItem);
    setRefreshKey((prev: number) => prev + 1);
  };

  const handleUnlock = async () => {
    try {
      // Try biometric unlock if available for master
      await verifyBiometrics();
      setIsLocked(false);
    } catch (e) {
      // Fallback to manual unlock (since we don't have a global password yet, 
      // just clicking unlock is the only way if no biometrics)
      setIsLocked(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none" style={{ fontFamily: 'var(--font-display)' }}>Seed Vault</h1>
              <p className="text-[10px] text-zinc-500 font-medium">Encrypted · Offline · Local</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLocked(true)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-all"
              title="ボルトをロック"
            >
              <Lock className="w-4 h-4" />
            </button>
            <a
              href="https://github.com/dma-cmyk/LensKey-Vault"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              GitHub →
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {isLocked ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-zinc-800">
              <Lock className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">ボルトはロックされています</h2>
            <p className="text-zinc-500 text-sm mb-8 text-center leading-relaxed">
              一定時間の無操作、または手動ロックにより<br />セキュリティ保護されています
            </p>
            <Button size="lg" onClick={handleUnlock} className="min-w-[160px]">
              ロックを解除
            </Button>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <Dashboard
                key={refreshKey}
                onAddNew={() => navigateTo('create')}
                onScan={() => navigateTo('scan')}
                onSelectItem={(item) => navigateTo('view', item)}
              />
            )}
            {currentView === 'create' && (
              <CreateItem
                onBack={() => navigateTo('dashboard')}
                onSuccess={() => navigateTo('dashboard')}
              />
            )}
            {currentView === 'scan' && (
              <Scanner
                onBack={() => navigateTo('dashboard')}
                onRestored={() => navigateTo('dashboard')}
              />
            )}
            {currentView === 'view' && selectedItem && (
              <ItemView
                item={selectedItem}
                onBack={() => navigateTo('dashboard')}
                onItemUpdated={handleItemUpdated}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/50 py-3">
        <p className="text-center text-[10px] text-zinc-600">
          すべてのデータはブラウザのIndexedDBに保存されます。外部への送信はありません。
        </p>
      </footer>
    </div>
  );
}

export default App;
