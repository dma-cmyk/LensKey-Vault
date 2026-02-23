import { useState, useEffect } from 'react';
import { Button, Card, Input, DEFAULT_CATEGORIES } from './UIParts';
import { encryptData } from '../lib/crypto';
import { db } from '../lib/db';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';
import { ArrowLeft, Save, Printer, AlertTriangle, Fingerprint, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

interface CreateItemProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateItem({ onBack, onSuccess }: CreateItemProps) {
  const [step, setStep] = useState<'form' | 'biometrics' | 'qr'>('form');
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    category: 'パスワード',
    seed: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isBioAvailable, setIsBioAvailable] = useState(false);

  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
    db.categories.toArray().then(cats => {
      const dbCats = cats.map(c => c.name);
      setCategories([...new Set([...DEFAULT_CATEGORIES, ...dbCats])]);
    });
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
    if (formData.password.length < 8) {
      setError('パスワードは8文字以上にしてください');
      return;
    }

    try {
      const encrypted = await encryptData(formData.seed, formData.password);
      const id = crypto.randomUUID();

      await db.vault_items.add({
        id,
        title: formData.title,
        category: formData.category,
        encryptedData: encrypted,
        createdAt: new Date().toISOString(),
        hasBiometrics: false
      });

      const qrData = JSON.stringify({
        v: 1,
        t: formData.title,
        c: formData.category,
        d: encrypted
      });

      const url = await QRCode.toDataURL(qrData, {
        width: 500,
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
      setError('保存に失敗しました');
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

  /* ── QR完成画面 ── */
  if (step === 'qr') {
    return (
      <div className="space-y-6">
        <div className="text-center pt-4">
          <div className="w-14 h-14 bg-emerald-900/30 border border-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>登録完了</h2>
          <p className="text-zinc-500 text-sm">QRコードを物理バックアップとして保存してください</p>
        </div>

        <Card>
          <div className="p-6 bg-white flex justify-center rounded-xl">
            {qrCodeUrl && <img src={qrCodeUrl} alt="Vault QR Code" className="w-full max-w-[280px]" />}
          </div>
        </Card>

        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300/80">
            <strong>重要:</strong> このQRコードは暗号化済みです。復号にはパスワードが必要です。パスワードを忘れた場合は復元不可能です。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => window.print()} className="w-full">
            <Printer className="w-4 h-4" />
            印刷する
          </Button>
          <Button size="lg" onClick={onSuccess} className="w-full">
            完了
          </Button>
        </div>
      </div>
    );
  }

  /* ── 生体認証登録画面 ── */
  if (step === 'biometrics') {
    return (
      <div className="space-y-6 pt-10 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-blue-900/30 border border-blue-800 rounded-3xl flex items-center justify-center mx-auto">
          <Fingerprint className="w-10 h-10 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>生体認証を有効化</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            次回からパスワード入力なしで<br />指紋・顔認証でアクセスできます
          </p>
        </div>
        <div className="space-y-3 pt-4">
          <Button onClick={handleRegisterBio} size="lg" className="w-full">
            生体認証を登録
          </Button>
          <Button variant="ghost" onClick={() => setStep('qr')} className="w-full">
            スキップ
          </Button>
        </div>
      </div>
    );
  }

  /* ── 入力フォーム ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>新規シード登録</h2>
      </div>

      <Card>
        <form onSubmit={handleFormSubmit} className="p-5 space-y-5">
          <Input
            label="タイトル"
            placeholder="例: メインウォレット"
            required
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">カテゴリ</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <Input
            label="シードフレーズ"
            type="textarea"
            placeholder="12または24単語のシードフレーズを入力..."
            required
            rows={4}
            className="font-mono"
            value={formData.seed}
            onChange={e => setFormData({...formData, seed: e.target.value})}
          />

          <Input
            label="暗号化パスワード"
            type="password"
            placeholder="8文字以上"
            required
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          <Input
            label="パスワード確認"
            type="password"
            placeholder="もう一度入力"
            required
            value={formData.confirmPassword}
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
          />

          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 flex gap-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full">
            <Save className="w-4 h-4" />
            暗号化して保存
          </Button>
        </form>
      </Card>
    </div>
  );
}
