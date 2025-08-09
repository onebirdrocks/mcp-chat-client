# MCP Chat UI

Model Context Protocol（MCP）サーバーとやり取りするためのReactベースのユーザーインターフェース。

## 技術スタック

- **フレームワーク**: React 19 with TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **ルーティング**: React Router
- **国際化**: react-i18next
- **コード品質**: ESLint + Prettier

## プロジェクト構造

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── pages/         # ページコンポーネント
├── hooks/         # カスタムReact hooks
├── store/         # Zustand状態管理
├── utils/         # ユーティリティ関数
├── types/         # TypeScript型定義
├── i18n/          # 国際化設定
└── main.tsx       # アプリケーションエントリーポイント
```

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを開始
- `npm run build` - 本番用にビルド
- `npm run preview` - 本番ビルドをプレビュー
- `npm run lint` - ESLintを実行
- `npm run lint:fix` - ESLintの問題を修正
- `npm run format` - Prettierでコードをフォーマット
- `npm run format:check` - コードフォーマットをチェック

## パスエイリアス

プロジェクトはより清潔なインポートのためにパスエイリアスを使用します：

- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/pages/*` - src/pages/*
- `@/hooks/*` - src/hooks/*
- `@/store/*` - src/store/*
- `@/utils/*` - src/utils/*
- `@/types/*` - src/types/*
- `@/i18n/*` - src/i18n/*

## はじめに

1. 依存関係をインストール：
   ```bash
   npm install
   ```

2. 開発サーバーを開始：
   ```bash
   npm run dev
   ```

3. ブラウザで http://localhost:5173 を開く

## 開発

プロジェクトは以下で設定されています：
- TypeScript（型安全性のため）
- ESLint（コードリンティングのため）
- Prettier（コードフォーマットのため）
- Tailwind CSS（スタイリングのため）
- パスエイリアス（清潔なインポートのため）
- プレースホルダーコンポーネントを含む基本的なプロジェクト構造