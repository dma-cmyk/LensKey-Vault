import { useState, useEffect } from 'react';
import { type VaultItem } from '../lib/db';
import { Button, Card, Input } from './UIParts';
import { decryptData } from '../lib/crypto';
import { verifyBiometrics } from '../lib/auth';
import { ArrowLeft, EyeOff, Key, Fingerprint, Copy, Check, AlertCircle } from 'lucide-react';

interface ItemViewProps {
  item: VaultItem;
  onBack: () => void;
}

export function ItemView({ item, onBack }: ItemViewProps) {
  const [password, setPassword] = useState('');
  const [decryptedSeed, setDecryptedSeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => setDecryptedSeed(null), 2 * 60 * 1000);
      return () => {
        clearTimeout(timer);
        setDecryptedSeed(null);
      };
    }
  }, [decryptedSeed]);

  const handleManualDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const seed = await decryptData(item.encryptedData, password);
      setDecryptedSeed(seed);
    } catch (err: any) {
      setError(err.message || '復号に失敗しました');
    }
  };

  const handleBioDecrypt = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const bioPassword = await verifyBiometrics();
      const seed = await decryptData(item.encryptedData, bioPassword);
      setDecryptedSeed(seed);
    } catch {
      setError('生体認証に失敗しました。パスワードを入力してください。');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = () => {
    if (decryptedSeed) {
      navigator.clipboard.writeText(decryptedSeed);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h2>
          <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {!decryptedSeed ? (
        <Card>
          <div className="p-5 space-y-5">
            <p className="text-sm text-zinc-400 text-center py-2">
              シードフレーズを閲覧するには認証が必要です
            </p>

            {/* Password */}
            <form onSubmit={handleManualDecrypt} className="space-y-4">
              <Input
                label="パスワード"
                type="password"
                placeholder="マスターパスワードを入力"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full">
                <Key className="w-4 h-4" />
                復号する
              </Button>
            </form>

            {/* Biometrics */}
            {item.hasBiometrics && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-600">または</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={handleBioDecrypt}
                  disabled={isVerifying}
                >
                  <Fingerprint className="w-4 h-4" />
                  {isVerifying ? '認証中...' : '生体認証でアクセス'}
                </Button>
              </>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 flex gap-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400">シードフレーズ</label>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    {isCopied ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-400" /> コピー済</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> コピー</>
                    )}
                  </button>
                  <button
                    onClick={() => setDecryptedSeed(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-900/50 rounded-lg text-xs font-medium transition-colors text-zinc-400 hover:text-red-400"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    ロック
                  </button>
                </div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 font-mono text-center text-lg break-all leading-loose select-all">
                {decryptedSeed}
              </div>
            </div>
          </Card>

          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-400/80 text-center">
            ⏱ セキュリティのため2分後に自動ロックされます
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full">
            ← ダッシュボードに戻る
          </Button>
        </div>
      )}
    </div>
  );
}
