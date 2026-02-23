import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Card, Input, cn } from './UIParts';
import { decryptData } from '../lib/crypto';
import { db } from '../lib/db';
import {
  ArrowLeft, AlertCircle, CheckCircle2, Save, Fingerprint,
  Camera, FileImage, SwitchCamera, Loader2
} from 'lucide-react';
import { isWebAuthnAvailable, registerBiometrics } from '../lib/auth';

interface ScannerProps {
  onBack: () => void;
  onRestored: () => void;
}

type ScanMode = 'camera' | 'file';

interface CameraInfo {
  id: string;
  label: string;
}

export function Scanner({ onBack, onRestored }: ScannerProps) {
  const [scanResult, setScanResult] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decryptedSeed, setDecryptedSeed] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBioAvailable, setIsBioAvailable] = useState(false);
  const [enableBio, setEnableBio] = useState(false);

  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isWebAuthnAvailable().then(setIsBioAvailable);
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.d && data.t) {
        setScanResult(data);
        // Stop camera after successful scan
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
          setIsCameraActive(false);
        }
      } else {
        setError('無効なQRコードです');
      }
    } catch {
      setError('QRコードの形式が不正です');
    }
  }, []);

  const startCamera = useCallback(async (cameraId: string) => {
    if (!scannerRef.current) return;
    setIsCameraStarting(true);
    setError(null);

    try {
      // Stop existing scan if running
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        cameraId,
        { fps: 15, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      setError('カメラの起動に失敗しました。カメラのアクセスを許可してください。');
      console.error(err);
    } finally {
      setIsCameraStarting(false);
    }
  }, [handleScanSuccess]);

  // Initialize scanner & fetch cameras
  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader');
    scannerRef.current = qr;

    Html5Qrcode.getCameras().then(devices => {
      if (devices.length > 0) {
        const cams = devices.map(d => ({ id: d.id, label: d.label || 'カメラ' }));
        setCameras(cams);
        // Prefer back camera
        const backIdx = cams.findIndex(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.includes('背面')
        );
        const idx = backIdx >= 0 ? backIdx : 0;
        setActiveCameraIdx(idx);
        startCamera(cams[idx].id);
      }
    }).catch(() => {
      // Camera not available, fall back to file mode
      setScanMode('file');
    });

    return () => {
      if (qr.isScanning) {
        qr.stop().catch(() => {});
      }
      qr.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle mode change
  const handleModeChange = async (mode: ScanMode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setError(null);

    if (mode === 'file') {
      // Stop camera
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop().catch(() => {});
        setIsCameraActive(false);
      }
    } else if (mode === 'camera' && cameras.length > 0) {
      startCamera(cameras[activeCameraIdx].id);
    }
  };

  // Switch camera
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(nextIdx);
    await startCamera(cameras[nextIdx].id);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;
    setError(null);

    try {
      const result = await scannerRef.current.scanFile(file, false);
      handleScanSuccess(result);
    } catch {
      setError('QRコードを検出できませんでした。画像を確認してください。');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      const id = crypto.randomUUID();
      if (enableBio) {
        await registerBiometrics(password, id, scanResult.t || 'Restored Seed');
      }

      await db.vault_items.add({
        id,
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
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl">
            <button
              onClick={() => handleModeChange('camera')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                scanMode === 'camera'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Camera className="w-4 h-4" />
              カメラ
            </button>
            <button
              onClick={() => handleModeChange('file')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                scanMode === 'file'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <FileImage className="w-4 h-4" />
              画像ファイル
            </button>
          </div>

          {/* Camera View */}
          {scanMode === 'camera' && (
            <Card>
              <div className="relative overflow-hidden rounded-xl">
                <div
                  id="qr-reader"
                  className={cn(
                    "w-full min-h-[300px] bg-black",
                    !isCameraActive && "flex items-center justify-center"
                  )}
                >
                  {isCameraStarting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                      <p className="text-sm text-zinc-400">カメラ起動中...</p>
                    </div>
                  )}
                </div>

                {/* Camera controls overlay */}
                {cameras.length > 1 && isCameraActive && (
                  <div className="absolute bottom-3 right-3 z-20">
                    <button
                      onClick={handleSwitchCamera}
                      className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all active:scale-90 border border-white/10"
                      title={cameras[(activeCameraIdx + 1) % cameras.length]?.label}
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Camera info */}
              {cameras.length > 0 && (
                <p className="text-center text-[11px] text-zinc-600 py-2 px-4 truncate">
                  {cameras[activeCameraIdx]?.label}
                </p>
              )}
            </Card>
          )}

          {/* File Upload */}
          {scanMode === 'file' && (
            <Card>
              <div className="p-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="qr-file-input"
                />
                <label
                  htmlFor="qr-file-input"
                  className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-2xl cursor-pointer transition-all group"
                >
                  <div className="w-16 h-16 bg-zinc-800 group-hover:bg-blue-600/20 rounded-2xl flex items-center justify-center transition-all">
                    <FileImage className="w-8 h-8 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-300 group-hover:text-blue-300 transition-colors">
                      QR画像をタップして選択
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      PNG, JPG, WEBP 対応
                    </p>
                  </div>
                </label>
              </div>
            </Card>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 flex gap-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
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
              <label className="block text-sm font-medium text-zinc-400">復号された内容</label>
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
