import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button, Card, Input, cn } from './UIParts';
import { decryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { ArrowLeft, AlertCircle, CheckCircle2, Save, Fingerprint } from 'lucide-react';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';

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
  const [isBioAvailable, setIsBioAvailable] = useState(false);
  const [enableBio, setEnableBio] = useState(false);

  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 15, qrbox: { width: 280, height: 280 } },
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
            setError('無効なQRコードです');
          }
        } catch {
          setError('QRコードの形式が不正です');
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
      setDecryptedSeed(null);
    };
  }, []);

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => setDecryptedSeed(null), 2 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [decryptedSeed]);

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const seed = await decryptData(scanResult.d, password);
      setDecryptedSeed(seed);
    } catch (err: any) {
      setError(err.message || '復号に失敗しました。パスワードを確認してください。');
    }
  };

  const handleSave = async () => {
    if (!scanResult || !decryptedSeed) return;
    setIsSaving(true);
    try {
      if (enableBio) {
        await registerBiometrics(password);
      }

      await db.vault_items.add({
        id: crypto.randomUUID(),
        title: scanResult.t || 'Restored Seed',
        category: scanResult.c || 'その他',
        encryptedData: scanResult.d,
        createdAt: new Date().toISOString(),
        hasBiometrics: enableBio
      });
      onRestored();
    } catch (err: any) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>QRから復元</h2>
      </div>

      {!scanResult ? (
        <Card>
          <div className="p-4">
            <div id="reader" className="w-full" />
          </div>
        </Card>
      ) : !decryptedSeed ? (
        <Card>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">
                QR検出: <strong>{scanResult.t}</strong>
              </p>
            </div>

            <form onSubmit={handleDecrypt} className="space-y-4">
              <Input
                label="マスターパスワード"
                type="password"
                placeholder="このバックアップのパスワード"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 flex gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full">
                復号する
              </Button>
            </form>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="p-5 space-y-4">
              <label className="block text-sm font-medium text-zinc-400">復号されたシードフレーズ</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-center break-all leading-relaxed select-all">
                {decryptedSeed}
              </div>
            </div>
          </Card>

          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 text-sm text-blue-300/80">
            このデバイスのローカルDBに保存して、次回から素早くアクセスできるようにしますか？
          </div>

          {isBioAvailable && (
            <button
              onClick={() => setEnableBio(!enableBio)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                enableBio 
                  ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5" />
                <span className="text-sm font-medium">生体認証を有効にする</span>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full relative transition-colors",
                enableBio ? "bg-blue-600" : "bg-zinc-800"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  enableBio ? "left-5" : "left-1"
                )} />
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={onRestored} className="w-full">
              保存せず終了
            </Button>
            <Button
              onClick={handleSave}
              className="w-full"
              size="lg"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              保存する
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
