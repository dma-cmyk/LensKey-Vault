# 🗝️ LensKey Vault

**LensKey Vault** は、セキュリティ、プライバシー、そして使いやすさを追求した、オフラインファーストの秘密情報管理ツールです。シードフレーズ、パスワード、秘密鍵などの重要なデータを、ブラウザ内の安全な領域に隔離して保管します。

![LensKey Vault](https://img.shields.io/badge/Security-Offline--Only-blue?style=for-the-badge&logo=shield)
![Tech](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Tailwind-61DAFB?style=for-the-badge)

## 🌟 主な機能

- **🛡️ 強固な暗号化**: Web Crypto API (AES-256-GCM) を使用し、マスターパスワードでデータを守ります。
- **☣️ オフライン・ローカル・オンリー**: サーバーへの送信は一切行いません。すべてのデータはあなたのブラウザ (IndexedDB) 内にのみ保存されます。
- **🧬 生体認証 (WebAuthn)**: 指紋や顔認証を使用して、パスワード入力なしで安全にデータにアクセス可能です。
- **📱 QRコード・バックアップ**: 暗号化された状態のままQRコードとして出力。物理的なバックアップやデバイス間移行が安全に行えます。
- **🎨 プレミアム UI/UX**: Tailwind CSS v4 を採用したグラスモーフィズムデザイン。直感的で洗練された操作感を提供します。
- **🏷️ カスタムカテゴリ**: カテゴリの作成・削除、フィルタリングが可能で、大量の記録も整理して管理できます。

## 🔐 セキュリティモデル

- **鍵生成**: PBKDF2 (100,000 iterations) を使用し、ユーザーパスワードから強力な暗号化鍵を生成。
- **暗号化**: AES-256-GCM による認証付き暗号化。
- **ゼロ知識**: 開発者であっても、あなたのマスターパスワードや保存されたデータにアクセスすることは不可能です。

## 🛠️ 技術スタック

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB Wrapper)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Encryption**: [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## 🚀 開発を始める

### 1. インストール
```bash
npm install
```

### 2. 開発サーバーの起動
```bash
npm run dev
```

### 3. ビルド
```bash
npm run build
```

---

*Made with focus on security and privacy.*

