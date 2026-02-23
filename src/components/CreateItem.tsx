import { useState, useEffect } from 'react';
import { Button, Card, Input, CATEGORIES, SectionHeader, type Category } from './UIParts';
import { encryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';
import { ArrowLeft, Save, Printer, AlertTriangle, Fingerprint, LucideShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

interface CreateItemProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateItem({ onBack, onSuccess }: CreateItemProps) {
  const [step, setStep] = useState<'form' | 'biometrics' | 'qr'>('form');
  const [formData, setFormData] = useState({
    title: '',
    category: 'DeFi' as Category,
    seed: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isBioAvailable, setIsBioAvailable] = useState(false);

  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
  }, []);

  useEffect(() => {
    if (step !== 'form') {
      const timer = setTimeout(() => {
        setFormData(prev => ({ ...prev, seed: '' }));
      }, 5 * 60 * 1000);
      return () => {
        clearTimeout(timer);
        setFormData(prev => ({ ...prev, seed: '' }));
      };
    }
  }, [step]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    try {
      const encrypted = await encryptData(formData.seed, formData.password);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await db.vault_items.add({
        id,
        title: formData.title,
        category: formData.category,
        encryptedData: encrypted,
        createdAt,
        hasBiometrics: false
      });

      const qrData = JSON.stringify({
        v: 1,
        t: formData.title,
        c: formData.category,
        d: encrypted
      });

      const url = await QRCode.toDataURL(qrData, {
        width: 600,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeUrl(url);

      if (isBioAvailable) {
        setStep('biometrics');
      } else {
        setStep('qr');
      }
    } catch (err) {
      setError('保存に失敗しました。');
      console.error(err);
    }
  };

  const handleRegisterBio = async () => {
    try {
      await registerBiometrics(formData.password);
      const latest = await db.vault_items.orderBy('createdAt').last();
      if (latest) {
        await db.vault_items.update(latest.id, { hasBiometrics: true });
      }
      setStep('qr');
    } catch (err) {
      console.error(err);
      alert('生体認証の登録に失敗しました。スキップします。');
      setStep('qr');
    }
  };

  if (step === 'qr') {
    return (
      <div className="max-w-xl mx-auto space-y-12 py-6 animate-in slide-in-from-bottom duration-700">
        <div className="text-center">
          <div className="relative w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)]">
            <LucideShieldCheck className="w-12 h-12 text-emerald-400" />
          </div>
          <SectionHeader title="登録が完了しました" subtitle="物理バックアップとしてこのQRコードを保存・印刷してください。" />
        </div>

        <Card className="p-10 bg-white flex justify-center shadow-2xl scale-100 ring-1 ring-white/10 ring-offset-8 ring-offset-black">
          {qrCodeUrl && <img src={qrCodeUrl} alt="Vault QR Code" className="w-full max-w-[320px] mix-blend-multiply" />}
        </Card>

        <div className="glass-panel border-amber-500/20 bg-amber-500/5 p-6 rounded-3xl flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-200/60 leading-relaxed font-medium">
            <strong className="text-amber-400">重要:</strong> このQRコードは暗号化されています。復号には設定したパスワードが必要です。パスワードを忘れると復元できません。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="glass" size="lg" onClick={() => window.print()}>
            <Printer className="w-5 h-5" />
            印刷する (PDF保存)
          </Button>
          <Button size="lg" onClick={onSuccess}>
            ダッシュボードへ戻る
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'biometrics') {
    return (
      <div className="max-w-lg mx-auto space-y-12 py-20 text-center animate-in zoom-in-95 duration-700">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-[50px] rounded-full animate-float" />
          <div className="relative w-full h-full glass-panel flex items-center justify-center rounded-[2.5rem] border-blue-500/30">
            <Fingerprint className="w-16 h-16 text-blue-400" />
          </div>
        </div>
        <div>
          <SectionHeader title="生体認証の有効化" subtitle="次回からパスワードの代わりに指紋や顔認証でシードフレーズを閲覧できるようになります。" />
        </div>
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Button onClick={handleRegisterBio} size="lg" className="w-full h-16 text-lg">
            生体認証を登録する
          </Button>
          <Button variant="ghost" onClick={() => setStep('qr')} className="w-full">
            今はスキップ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-left duration-500">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="w-12 h-12 glass-panel flex items-center justify-center rounded-2xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <SectionHeader title="新規シード登録" subtitle="新しいシードフレーズをローカルに暗号化して保存します" />
      </div>

      <Card className="p-10 border border-white/[0.05] bg-white/[0.02]">
        <form onSubmit={handleFormSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="タイトル・名称" 
              placeholder="例: メインウォレット" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-zinc-400 ml-1 font-display">カテゴリ</label>
              <select 
                className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 appearance-none font-medium"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as Category})}
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
              </select>
            </div>
          </div>

          <Input 
            label="12または24単語のシードフレーズ" 
            type="textarea"
            placeholder="word1 word2 word3..." 
            required
            rows={5}
            className="font-mono text-center tracking-wide leading-loose"
            value={formData.seed}
            onChange={e => setFormData({...formData, seed: e.target.value})}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="暗号化パスワード" 
              type="password"
              placeholder="強固なパスワード" 
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <Input 
              label="パスワードの確認" 
              type="password"
              placeholder="再入力" 
              required
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          {error && (
            <div className="p-5 glass-panel border-red-500/20 bg-red-500/5 rounded-2xl flex gap-4 text-red-200 text-sm font-medium animate-in shake duration-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full h-16 text-lg">
            <Save className="w-5 h-5 mr-1" />
            暗号化してローカルに保存
          </Button>
        </form>
      </Card>
      
      <div className="flex justify-center items-center gap-8 text-zinc-600">
        <div className="flex items-center gap-2">
          <LucideShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">AES-256-GCM Proteced</span>
        </div>
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Biometric Optional</span>
        </div>
      </div>
    </div>
  );
}
