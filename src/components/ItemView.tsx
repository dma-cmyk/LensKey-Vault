import { useState, useEffect, useRef } from 'react';
import { type VaultItem } from '../lib/db';
import { Button, Card, Input, DEFAULT_CATEGORIES, Modal } from './UIParts';
import { decryptData, encryptData } from '../lib/crypto';
import { verifyBiometrics } from '../lib/auth';
import { ArrowLeft, EyeOff, Key, Fingerprint, Copy, Check, AlertCircle, QrCode, Pencil, Lock as LockIcon } from 'lucide-react';
import { cn } from './UIParts';
import QRCode from 'qrcode';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';
import { db } from '../lib/db';

interface ItemViewProps {
  item: VaultItem;
  onBack: () => void;
  onItemUpdated?: (updatedItem: VaultItem) => void;
}

export function ItemView({ item, onBack, onItemUpdated }: ItemViewProps) {
  const [password, setPassword] = useState('');
  const [decryptedSeed, setDecryptedSeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);
  const [isBioAvailable, setIsBioAvailable] = useState(false);

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [currentTitle, setCurrentTitle] = useState(item.title);
  const [currentCategory, setCurrentCategory] = useState(item.category);
  const [categories, setCategories] = useState<string[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
    db.categories.orderBy('order').toArray().then(cats => {
      const dbCats = cats.map(c => c.name);
      setCategories([...new Set([...DEFAULT_CATEGORIES, ...dbCats])]);
    });
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const saveTitle = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === currentTitle) {
      setEditTitle(currentTitle);
      setIsEditingTitle(false);
      return;
    }
    await db.vault_items.update(item.id, { title: trimmed });
    setCurrentTitle(trimmed);
    setIsEditingTitle(false);
    onItemUpdated?.({ ...item, title: trimmed, category: currentCategory });
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (newCategory === currentCategory) return;
    await db.vault_items.update(item.id, { category: newCategory });
    setCurrentCategory(newCategory);
    onItemUpdated?.({ ...item, title: currentTitle, category: newCategory });
  };

  useEffect(() => {
    if (decryptedSeed) {
      const timer = setTimeout(() => {
        setDecryptedSeed(null);
        setShowQr(false);
      }, 2 * 60 * 1000);
      return () => {
        clearTimeout(timer);
        setDecryptedSeed(null);
        setShowQr(false);
      };
    }
  }, [decryptedSeed]);

  useEffect(() => {
    if (showQr && !qrBlobUrl) {
      const qrData = JSON.stringify({
        v: 1,
        t: item.title,
        c: item.category,
        d: item.encryptedData
      });

      QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrBlobUrl);
    }
  }, [showQr, item, qrBlobUrl]);

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
      const bioPassword = await verifyBiometrics(item.id);
      const seed = await decryptData(item.encryptedData, bioPassword);
      setDecryptedSeed(seed);
    } catch {
      setError('生体認証に失敗しました。パスワードを入力してください。');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEnableBio = async () => {
    setError(null);
    try {
      await registerBiometrics(password, item.id, currentTitle);
      await db.vault_items.update(item.id, { hasBiometrics: true });
      alert('生体認証を有効化しました！次回から指紋・顔認証でアクセスできます。');
      onBack();
    } catch (err: any) {
      setError(err.message || '生体認証の登録に失敗しました');
    }
  };

  const copyToClipboard = () => {
    if (decryptedSeed) {
      navigator.clipboard.writeText(decryptedSeed);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (newPassword.length < 8) {
      setChangePasswordError('パスワードは8文字以上にしてください');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('パスワードが一致しません');
      return;
    }

    try {
      const encrypted = await encryptData(decryptedSeed!, newPassword);
      await db.vault_items.update(item.id, { encryptedData: encrypted });
      
      if (item.hasBiometrics) {
        // Re-register biometrics with the new password
        await registerBiometrics(newPassword, item.id, currentTitle);
      }
      
      setShowChangePasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      alert('パスワードを更新しました。セキュリティのためロックします。');
      setDecryptedSeed(null);
      setPassword('');
    } catch (err: any) {
      setChangePasswordError(err.message || 'パスワードの更新に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(currentTitle);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-lg font-bold bg-zinc-800 border border-blue-500 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              />
            ) : (
              <h2
                className="text-lg font-bold truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentTitle}
              </h2>
            )}
            <button
              onClick={() => {
                setEditTitle(currentTitle);
                setIsEditingTitle(!isEditingTitle);
              }}
              className={cn(
                "p-1.5 rounded-lg transition-all shrink-0",
                isEditingTitle
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
              )}
              title="タイトルを編集"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <select
              value={currentCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              className="text-xs bg-transparent border border-transparent hover:border-zinc-700 text-zinc-500 rounded-md px-1 py-0.5 focus:outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
              style={{ backgroundImage: 'none' }}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-zinc-600">·</span>
            <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {!decryptedSeed ? (
        <Card>
          <div className="p-5 space-y-5">
            <p className="text-sm text-zinc-400 text-center py-2">
              記録内容を閲覧するには認証が必要です
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
            {item.hasBiometrics ? (
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
            ) : isBioAvailable && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-blue-400 hover:text-blue-300 gap-1.5"
                  onClick={handleEnableBio}
                  disabled={!password || password.length < 8}
                >
                  <Fingerprint className="w-4 h-4" />
                  生体認証を有効化する
                </Button>
                <p className="text-[10px] text-zinc-600 text-center mt-2">
                  ※パスワードを入力した状態で有効化してください
                </p>
              </div>
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
                <label className="text-sm font-medium text-zinc-400">プロパティ</label>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      showQr ? "bg-blue-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {showQr ? 'QRを閉じる' : 'QRを表示'}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors text-zinc-300"
                  >
                    {isCopied ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-400" /> コピー済</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> コピー</>
                    )}
                  </button>
                  <button
                    onClick={() => setShowChangePasswordModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors text-zinc-300"
                  >
                    <LockIcon className="w-3.5 h-3.5" />
                    パスワード変更
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

              {showQr ? (
                <div className="p-4 bg-white rounded-xl flex justify-center animate-in zoom-in-95 duration-200">
                  {qrBlobUrl ? (
                    <img src={qrBlobUrl} alt="Vault Item QR" className="w-full max-w-[240px]" />
                  ) : (
                    <div className="w-[240px] h-[240px] bg-zinc-100 animate-pulse rounded-lg" />
                  )}
                </div>
              ) : (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 font-mono text-center text-lg break-all leading-loose select-all animate-in fade-in duration-300">
                  {decryptedSeed}
                </div>
              )}
            </div>
          </Card>

          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-400/80 text-center">
            ⏱ セキュリティのため2分後に自動ロックされます
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full">
            ← ダッシュボードに戻る
          </Button>

          {/* Change Password Modal */}
          <Modal
            isOpen={showChangePasswordModal}
            onClose={() => {
              setShowChangePasswordModal(false);
              setNewPassword('');
              setConfirmNewPassword('');
              setChangePasswordError(null);
            }}
            title="パスワード変更"
          >
            <form onSubmit={handleChangePassword} className="p-5 space-y-5">
              <p className="text-xs text-zinc-500 leading-relaxed">
                このアイテムの暗号化に使用するパスワードを変更します。<br />
                新しいパスワードでデータを再暗号化し、必要に応じて生体認証情報も更新します。
              </p>
              
              <Input
                label="新しいパスワード"
                type="password"
                placeholder="8文字以上"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />

              <Input
                label="パスワード確認"
                type="password"
                placeholder="もう一度入力"
                required
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
              />

              {changePasswordError && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 flex gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {changePasswordError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={() => setShowChangePasswordModal(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1">
                  更新する
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}
