import { useState, useEffect } from 'react';
import { type VaultItem } from '../lib/db';
import { Button, Card, Input, SectionHeader } from './UIParts';
import { decryptData } from '../lib/crypto';
import { verifyBiometrics } from '../lib/auth';
import { ArrowLeft, EyeOff, Key, Fingerprint, Copy, Check, ShieldCheck, AlertCircle, LockKeyhole } from 'lucide-react';

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
      setError(err.message || '復号に失敗しました。正しいパスワードを入力してください。');
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

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom duration-700">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="w-12 h-12 glass-panel flex items-center justify-center rounded-2xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <SectionHeader title={item.title} subtitle={`登録日: ${new Date(item.createdAt).toLocaleString()}`} />
      </div>

      {!decryptedSeed ? (
        <Card className="p-12 space-y-12 animate-in zoom-in-95 duration-500 overflow-visible" hover={false}>
          <div className="text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full" />
              <div className="relative w-full h-full glass-panel flex items-center justify-center rounded-[2rem] border-blue-500/20">
                <LockKeyhole className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight">Security Verification</h3>
              <p className="text-zinc-500 font-medium mt-1">
                保存されたデータを閲覧するには、認証が必要です
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <form onSubmit={handleManualDecrypt} className="space-y-6">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1 font-display">Password Access</label>
              <Input 
                type="password"
                placeholder="Master Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full h-14">
                <Key className="w-4 h-4" />
                復号する
              </Button>
            </form>

            <div className="flex flex-col gap-6">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1 font-display flex items-center gap-2">
                Biometric Login
                {item.hasBiometrics && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              </label>
              <Button 
                variant="glass" 
                size="lg"
                className="h-14 w-full border-white/5 bg-white/[0.03] disabled:opacity-20" 
                onClick={handleBioDecrypt}
                disabled={!item.hasBiometrics || isVerifying}
              >
                <Fingerprint className="w-5 h-5 text-blue-400" />
                {isVerifying ? '認証中...' : item.hasBiometrics ? '指紋・顔認証を使用' : '生体認証未登録'}
              </Button>
              <p className="text-[10px] text-zinc-600 font-medium leading-relaxed mt-auto md:mb-1">
                ※ 生体認証を登録している場合、パスワードなしで即座に復号可能です。
              </p>
            </div>
          </div>

          {error && (
            <div className="p-5 glass-panel border-red-500/20 bg-red-500/5 rounded-2xl flex gap-4 text-red-300 text-sm font-medium animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              {error}
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-10">
          <Card className="p-10 space-y-10 border-blue-500/30 bg-blue-500/[0.02] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-500" hover={false}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 glass-panel border-blue-500/30 flex items-center justify-center rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Decrypted Successfully</h3>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">Verified Secure Access</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDecryptedSeed(null)} className="text-zinc-500 hover:text-red-400">
                <EyeOff className="w-4 h-4" />
                閲覧を終了
              </Button>
            </div>

            <div className="relative group">
              <div className="p-10 bg-black/60 glass-panel border-white/5 rounded-[2.5rem] text-2xl font-mono text-center tracking-wider break-words leading-loose text-zinc-100 shadow-inner select-all selection:bg-blue-500/40">
                {decryptedSeed}
              </div>
              <button 
                onClick={copyToClipboard}
                className="absolute top-4 right-4 w-14 h-14 glass-panel border-white/10 flex items-center justify-center rounded-2xl text-zinc-400 hover:text-white hover:border-blue-500/50 transition-all hover:scale-110 active:scale-90 shadow-2xl"
                title="クリップボードにコピー"
              >
                {isCopied ? <Check className="w-6 h-6 text-emerald-400 animate-in zoom-in duration-300" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>

            <div className="p-6 glass-panel border-amber-500/10 bg-amber-500/[0.02] rounded-3xl flex gap-4 items-center">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500/60" />
              <p className="text-xs text-amber-200/40 font-medium leading-relaxed">
                セキュリティのため、2分後に自動的に再ロックされます。閲覧後は速やかに「閲覧を終了」を押してください。
              </p>
            </div>
          </Card>

          <Button variant="glass" size="lg" onClick={onBack} className="w-full h-16 text-zinc-500">
            ダッシュボードへ戻る
          </Button>
        </div>
      )}
    </div>
  );
}
