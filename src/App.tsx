import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CreateItem } from './components/CreateItem';
import { Scanner } from './components/Scanner';
import { ItemView } from './components/ItemView';
import { type VaultItem } from './lib/db';
import { Shield, Github, Info } from 'lucide-react';

type View = 'dashboard' | 'create' | 'scan' | 'view';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  const navigateTo = (view: View, item: VaultItem | null = null) => {
    setSelectedItem(item);
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 border-b border-zinc-800/50 pb-6">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigateTo('dashboard')}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Hybrid Seed Vault</h1>
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Local-First Security</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <Info className="w-4 h-4" />
              Security Guide
            </a>
            <a href="https://github.com/dma/LensKey-Vault" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <Github className="w-4 h-4" />
              Source Code
            </a>
          </nav>
        </header>

        {/* Main Content */}
        <main className="min-h-[60vh]">
          {currentView === 'dashboard' && (
            <Dashboard 
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
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          <p>© 2026 Hybrid Seed Vault. Built with Web Crypto & Privacy first principles.</p>
          <div className="flex justify-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Fully Offline & Private
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
