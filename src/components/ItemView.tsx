import { useState, useEffect } from 'react';
import { type VaultItem } from '../lib/db';
import { Button, Card, Input } from './UIParts';
import { decryptData } from '../lib/crypto';
import { verifyBiometrics } from '../lib/auth';
import { ArrowLeft, EyeOff, Key, Fingerprint, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

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
    } catch (err: any) {
      setError('生体認証による復号に失敗しました。パスワードを入力してください。');
      console.error(err);
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

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => setDecryptedSeed(null), 2 * 60 * 1000); // 2 mins
      return () => {
        clearTimeout(timer);
        setDecryptedSeed(null);
      };
    }
  }, [decryptedSeed]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">{item.title}</h2>
          <p className="text-zinc-500 text-sm">登録日: {new Date(item.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {!decryptedSeed ? (
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
              <Key className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-200">閲覧には認証が必要です</h3>
              <p className="text-zinc-500 text-sm mt-1">
                保存されたデータを復号するために、パスワード入力または生体認証を行ってください。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleManualDecrypt} className="space-y-4">
              <Input 
                label="パスワード" 
                type="password"
                placeholder="マスターパスワード"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                復号する
              </Button>
            </form>

            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium text-zinc-400">クイック認証</label>
              <Button 
                variant="secondary" 
                className="h-[52px] w-full border-none bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30" 
                onClick={handleBioDecrypt}
                disabled={!item.hasBiometrics || isVerifying}
              >
                <Fingerprint className="w-5 h-5 text-blue-400" />
                {isVerifying ? '認証中...' : item.hasBiometrics ? '生体認証を使用' : '生体認証未登録'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-xl flex gap-3 text-red-200 text-sm animate-in fade-in duration-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-8 space-y-6 bg-blue-600/5 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-semibold">復号化済み</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDecryptedSeed(null)} className="text-zinc-500">
                <EyeOff className="w-4 h-4" />
                隠す
              </Button>
            </div>

            <div className="relative group">
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-xl font-mono text-center tracking-wider break-words leading-relaxed text-zinc-100 shadow-inner">
                {decryptedSeed}
              </div>
              <button 
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="クリップボードにコピー"
              >
                {isCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl flex gap-3 text-zinc-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>セキュリティのため、確認が終わったら速やかに「隠す」ボタンを押すか、画面を閉じてください。</p>
            </div>
          </Card>

          <Button variant="secondary" onClick={onBack} className="w-full py-4 text-zinc-400">
            閉じる
          </Button>
        </div>
      )}
    </div>
  );
}
