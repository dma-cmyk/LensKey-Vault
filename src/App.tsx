import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CreateItem } from './components/CreateItem';
import { Scanner } from './components/Scanner';
import { ItemView } from './components/ItemView';
import { type VaultItem } from './lib/db';
import { Shield, Github, Info, Lock } from 'lucide-react';

type View = 'dashboard' | 'create' | 'scan' | 'view';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  const navigateTo = (view: View, item: VaultItem | null = null) => {
    setSelectedItem(item);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-float-delayed" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full animate-float" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full animate-float" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 md:py-16">
        {/* Modern Header */}
        <header className="flex items-center justify-between mb-16 border-b border-white/5 pb-8">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => navigateTo('dashboard')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-display">Hybrid Seed Vault</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">v2.0 Beta</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Encrypted locally</span>
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group">
              <Info className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
              Guide
            </a>
            <a href="https://github.com/dma-cmyk/LensKey-Vault" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group">
              <Github className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              Source
            </a>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sync: Off
            </div>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="min-h-[60vh] transition-all duration-500">
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

        {/* Minimal Footer */}
        <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-600">
          <div className="flex items-center gap-2 order-2 md:order-1">
            <Lock className="w-4 h-4 text-zinc-700" />
            <p className="text-xs font-medium tracking-wide">
              © 2026 Hybrid Seed Vault. All data remains in your browser's IndexedDB.
            </p>
          </div>
          <div className="flex gap-8 order-1 md:order-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 transition-colors cursor-help">Privacy First</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 transition-colors cursor-help">Web Crypto Standard</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 transition-colors cursor-help">Open Source</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
