import { useState, useEffect } from 'react';
import { Button, Card, Input, CATEGORIES, type Category } from './UIParts';
import { encryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';
import { ArrowLeft, Save, Printer, CheckCircle2, AlertTriangle, Fingerprint } from 'lucide-react';
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

  // Check bio availability on mount or form success
  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
  }, []);

  // Clear memory on step change or unmount
  useEffect(() => {
    if (step !== 'form') {
      const timer = setTimeout(() => {
        setFormData(prev => ({ ...prev, seed: '' }));
      }, 5 * 60 * 1000); // Clear seed from memory after 5 mins
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
        hasBiometrics: false // Will update if bio is registered
      });

      const qrData = JSON.stringify({
        v: 1,
        t: formData.title,
        c: formData.category,
        d: encrypted
      });

      const url = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 1,
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
      // Update last inserted item to indicate bio protection
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
      <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">登録完了！</h2>
          <p className="text-zinc-400 mt-2">物理バックアップとしてこのQRコードを保存・印刷してください。</p>
        </div>

        <Card className="p-8 bg-white flex justify-center">
          {qrCodeUrl && <img src={qrCodeUrl} alt="Vault QR Code" className="w-full max-w-[300px]" />}
        </Card>

        <div className="bg-amber-900/20 border border-amber-900/30 p-4 rounded-xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-200/80">
            <strong>重要:</strong> パスワードを忘れると、このQRコードがあっても復元できません。パスワードも安全な場所に保管してください。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            印刷する
          </Button>
          <Button onClick={onSuccess}>
            ダッシュボードへ
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'biometrics') {
    return (
      <div className="max-w-md mx-auto space-y-8 py-12 text-center animate-in slide-in-from-right duration-500">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
          <Fingerprint className="w-10 h-10 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">生体認証の登録</h2>
          <p className="text-zinc-400 mt-2">
            次回からパスワード入力なしでシードフレーズを確認できるようになります。
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={handleRegisterBio} className="w-full py-4 text-lg">
            生体認証を有効にする
          </Button>
          <Button variant="ghost" onClick={() => setStep('qr')} className="w-full">
            今はスキップする
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-left duration-500">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <h2 className="text-2xl font-bold text-white">新規シードフレーズ登録</h2>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="タイトル・用途" 
            placeholder="例: メインウォレット" 
            required
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">カテゴリ</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as Category})}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <Input 
          label="シードフレーズ" 
          type="textarea"
          placeholder="12個または24個の単語を入力..." 
          required
          rows={4}
          value={formData.seed}
          onChange={e => setFormData({...formData, seed: e.target.value})}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="暗号化用パスワード" 
            type="password"
            placeholder="強力なパスワードを入力" 
            required
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
          <Input 
            label="パスワード（確認）" 
            type="password"
            placeholder="もう一度入力" 
            required
            value={formData.confirmPassword}
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-xl flex gap-3 text-red-200 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" className="w-full py-4 text-lg">
          <Save className="w-5 h-5" />
          暗号化して保存
        </Button>
      </form>
    </div>
  );
}
