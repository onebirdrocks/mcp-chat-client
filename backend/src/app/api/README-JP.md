# API エンドポイント ドキュメント

このドキュメントは、MCP Chat UI バックエンドに実装された API エンドポイントについて説明します。

## 設定エンドポイント

### GET/POST/PUT /api/settings

LLM プロバイダー設定、MCP サーバー設定、ユーザー設定を含むアプリケーション設定を管理します。

**GET /api/settings**
- 現在の設定構成を返します
- レスポンス：`llmProviders`、`mcpServers`、`preferences` を含む `Settings` オブジェクト

**POST /api/settings**
- 設定構成を作成または更新します
- リクエストボディ：部分的な `Settings` オブジェクト
- レスポンス：更新された `Settings` オブジェクト

**PUT /api/settings**
- 設定構成を更新します（POST と同じ）
- リクエストボディ：部分的な `Settings` オブジェクト
- レスポンス：更新された `Settings` オブジェクト

**レスポンス例：**
```json
{
  "llmProviders": [
    {
      "id": "openai-1",
      "name": "openai",
      "apiKey": "",
      "baseUrl": "https://api.openai.com/v1",
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4",
          "supportsToolCalling": true,
          "maxTokens": 8192
        }
      ]
    }
  ],
  "mcpServers": [
    {
      "id": "filesystem-1",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "enabled": false,
      "status": "disconnected"
    }
  ],
  "preferences": {
    "theme": "system",
    "language": "en",
    "autoScroll": true,
    "soundEnabled": false
  }
}
```

## チャット履歴エンドポイント

### GET /api/chat-history

オプションのフィルタリングとページネーションを使用してチャットセッション履歴を取得します。

**クエリパラメータ：**
- `limit`（オプション）：返すセッション数（1-100、デフォルト：50）
- `offset`（オプション）：スキップするセッション数（デフォルト：0）
- `query`（オプション）：セッションタイトル/コンテンツの検索クエリ
- `provider`（オプション）：LLM プロバイダーでフィルタ
- `sortBy`（オプション）：ソートフィールド（'createdAt'、'updatedAt'、'title'、デフォルト：'updatedAt'）
- `sortOrder`（オプション）：ソート順序（'asc'、'desc'、デフォルト：'desc'）

**レスポンス：**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "テストセッション",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "messageCount": 5,
      "provider": "openai",
      "model": "gpt-4"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### DELETE /api/chat-history

チャットセッションを削除します。

**クエリパラメータ：**
- `sessionId`（必須）：削除するセッションの ID

**レスポンス：**
```json
{
  "success": true
}
```

### PUT /api/chat-history

チャットセッションを更新します（例：名前変更）。

**クエリパラメータ：**
- `sessionId`（必須）：更新するセッションの ID

**リクエストボディ：**
```json
{
  "title": "新しいセッションタイトル"
}
```

**レスポンス：**
```json
{
  "id": "session-1",
  "title": "新しいセッションタイトル",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 個別セッションエンドポイント

### GET /api/chat-history/[sessionId]

すべてのメッセージを含む完全なチャットセッションを取得します。

**レスポンス：**
```json
{
  "id": "session-1",
  "title": "テストセッション",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

特定のチャットセッションを更新します。

**リクエストボディ：**
```json
{
  "title": "更新されたタイトル",
  "messages": [] // オプション：メッセージを更新
}
```

### DELETE /api/chat-history/[sessionId]

特定のチャットセッションを削除します。

**レスポンス：**
```json
{
  "success": true
}
```

## エラーハンドリング

すべてのエンドポイントは一貫したエラーハンドリングを使用します：

- **400 Bad Request**：バリデーションエラー、無効なパラメータ
- **404 Not Found**：セッションが見つからない
- **500 Internal Server Error**：サーバーエラー

**エラーレスポンス形式：**
```json
{
  "error": "ValidationError",
  "message": "詳細なエラーメッセージ",
  "statusCode": 400
}
```

## CORS サポート

すべてのエンドポイントはローカル開発用の CORS ヘッダーを含みます：
- 許可されたオリジン：`http://localhost:5173`、`http://localhost:3000`、`http://localhost:4173`
- 許可されたメソッド：`GET`、`POST`、`PUT`、`DELETE`、`OPTIONS`
- 資格情報サポート：`true`

## 満たされた要件

この実装は以下の要件を満たします：

- **2.2**：API 認証情報ストレージ - 設定エンドポイントは安全な API キーストレージを持つ LLM プロバイダー設定を管理
- **7.2**：暗号化ストレージ - API キーはローカルブラウザストレージに安全に保存（フロントエンドの責任）
- **9.2**：会話リストの表示 - GET /api/chat-history はページネーションされたセッションリストを返す
- **9.3**：完全な会話の読み込み - GET /api/chat-history/[sessionId] はメッセージを含む完全なセッションを返す
- **9.4**：会話の名前変更、削除、アーカイブ - PUT および DELETE エンドポイントはセッション管理操作をサポート