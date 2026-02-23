import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button, Card, Input, SectionHeader } from './UIParts';
import { decryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { ArrowLeft, Camera, ShieldAlert, CheckCircle2, Save, ScanText } from 'lucide-react';

interface ScannerProps {
  onBack: () => void;
  onRestored: () => void;
}

export function Scanner({ onBack, onRestored }: ScannerProps) {
  const [scanResult, setScanResult] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decryptedSeed, setDecryptedSeed] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 15, qrbox: { width: 300, height: 300 } },
      false
    );

    scanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.d && data.t) {
            setScanResult(data);
            scanner.clear();
          } else {
            setError('無効なVault QRコードです');
          }
        } catch (e) {
          setError('不明な形式のQRコードです');
        }
      },
      () => {
        // scan error
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      setDecryptedSeed(null);
    };
  }, []);

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => setDecryptedSeed(null), 2 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [decryptedSeed]);

  const handleDecrypt = async () => {
    setError(null);
    try {
      const seed = await decryptData(scanResult.d, password);
      setDecryptedSeed(seed);
    } catch (e: any) {
      setError(e.message || '復号に失敗しました。パスワードが正しいか確認してください。');
    }
  };

  const handleSaveToLocal = async () => {
    setIsSaving(true);
    try {
      await db.vault_items.add({
        id: crypto.randomUUID(),
        title: scanResult.t,
        category: scanResult.c || 'その他',
        encryptedData: scanResult.d,
        createdAt: new Date().toISOString(),
        hasBiometrics: false
      });
      onRestored();
    } catch (e) {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-12 animate-in zoom-in-95 duration-500">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="w-12 h-12 glass-panel flex items-center justify-center rounded-2xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <SectionHeader title="バックアップ復元" subtitle="お手持ちの物理QRコードからデータを復元します" />
      </div>

      {!scanResult ? (
        <div className="space-y-8">
          <Card className="p-3 border-white/10 bg-black/40 shadow-2xl relative group overflow-hidden" hover={false}>
            <div className="absolute inset-0 bg-blue-500/5 transition-opacity opacity-50 group-hover:opacity-100" />
            <div id="reader" className="w-full relative z-10 overflow-hidden rounded-[1.5rem]" />
          </Card>
          <div className="flex items-center gap-4 text-zinc-500 justify-center">
            <div className="w-12 h-px bg-white/5" />
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-black uppercase tracking-[0.2em]">Ready to scan</p>
            </div>
            <div className="w-12 h-px bg-white/5" />
          </div>
        </div>
      ) : (
        <Card className="p-10 space-y-8 border-emerald-500/20 bg-emerald-500/[0.02] animate-in slide-in-from-bottom duration-500 shadow-2xl overflow-visible">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 glass-panel border-emerald-500/30 flex items-center justify-center rounded-[2rem] shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] mb-2">
              <ScanText className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight">QR Detect Success</h3>
              <p className="text-emerald-400/60 font-medium mt-1">Found Item: <span className="text-emerald-400">{scanResult.t}</span></p>
            </div>
          </div>

          <div className="w-full h-px bg-white/[0.05]" />

          {!decryptedSeed ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Input 
                label="このバックアップのマスターパスワード" 
                type="password"
                placeholder="Password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {error && (
                <div className="p-4 glass-panel border-red-500/20 bg-red-500/5 rounded-2xl flex gap-3 text-red-300 text-xs font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  {error}
                </div>
              )}
              <Button className="w-full h-16 text-lg" onClick={handleDecrypt}>
                デコードを開始
              </Button>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="space-y-4">
                <label className="text-sm font-black text-zinc-500 uppercase tracking-widest ml-1 font-display">Decrypted Seed Phrase</label>
                <div className="p-8 bg-black/60 glass-panel border-white/5 rounded-3xl text-zinc-100 font-mono text-center text-xl tracking-wide break-all leading-relaxed shadow-inner select-all">
                  {decryptedSeed}
                </div>
              </div>
              <div className="p-6 glass-panel border-blue-500/20 bg-blue-500/5 rounded-3xl flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-200/60 leading-relaxed font-medium">
                  復号に成功しました。この端末のローカルデータベースにインポートして、次回から素早くアクセスできるようにしますか？
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="ghost" className="h-14" onClick={onRestored}>
                  インポートせずに終了
                </Button>
                <Button size="lg" className="h-16" onClick={handleSaveToLocal} disabled={isSaving}>
                  <Save className="w-5 h-5" />
                  データベースに保存
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
