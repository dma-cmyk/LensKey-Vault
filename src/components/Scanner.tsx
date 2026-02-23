import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button, Card, Input } from './UIParts';
import { decryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { ArrowLeft, Camera, ShieldAlert, CheckCircle2, Save } from 'lucide-react';

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
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.d && data.t) {
            setScanResult(data);
            scanner.clear();
          } else {
            setError('無効なQRコードです');
          }
        } catch (e) {
          setError('QRコードの形式が正しくありません');
        }
      },
      () => {
        // scan error
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      setDecryptedSeed(null); // Clear memory
    };
  }, []);

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => setDecryptedSeed(null), 2 * 60 * 1000); // 2 mins
      return () => clearTimeout(timer);
    }
  }, [decryptedSeed]);

  const handleDecrypt = async () => {
    setError(null);
    try {
      const seed = await decryptData(scanResult.d, password);
      setDecryptedSeed(seed);
    } catch (e: any) {
      setError(e.message || '復号に失敗しました');
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
    <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <h2 className="text-2xl font-bold text-white">QRコードから復元</h2>
      </div>

      {!scanResult ? (
        <div className="space-y-4">
          <Card className="p-4 bg-zinc-950 overflow-hidden">
            <div id="reader" className="w-full"></div>
          </Card>
          <div className="flex items-center gap-3 text-zinc-500 justify-center">
            <Camera className="w-4 h-4" />
            <p className="text-sm">カメラをQRコードに向けてください</p>
          </div>
        </div>
      ) : (
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-semibold">スキャン成功: {scanResult.t}</h3>
          </div>

          {!decryptedSeed ? (
            <>
              <Input 
                label="このQRコードのパスワードを入力" 
                type="password"
                placeholder="マスターパスワード"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button className="w-full" onClick={handleDecrypt}>
                復号して確認
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">復元されたシードフレーズ</label>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono break-all leading-relaxed">
                  {decryptedSeed}
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-900/30 p-4 rounded-xl flex gap-3 text-blue-200 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p>復号に成功しました。この端末のローカルデータベースに保存しますか？</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={onRestored}>
                  保存せずに終了
                </Button>
                <Button onClick={handleSaveToLocal} disabled={isSaving}>
                  <Save className="w-4 h-4" />
                  保存してダッシュボードへ
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
