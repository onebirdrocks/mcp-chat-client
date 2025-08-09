# セッション管理サービス

このドキュメントでは、MCP Chat UI バックエンドでチャットセッションを管理するための SessionManager サービスとその API エンドポイントについて説明します。

## SessionManager の機能

SessionManager は包括的なセッション管理機能を提供します：

- **セッションストレージ**：ファイルベースストレージによるチャットセッションの永続化ストレージ
- **セッション取得**：個別セッションの取得または複数セッションの検索/フィルタリング
- **セッションクリーンアップ**：年数と数量制限に基づく古いセッションの自動クリーンアップ
- **セッション検索**：タイトルまたはメッセージ内容によるセッション検索、プロバイダーによるフィルタリング
- **自動タイトル生成**：LLM サービスを使用したセッションタイトルの生成
- **セッション統計**：使用統計とプロバイダー内訳の取得

## API エンドポイント

### セッション管理

#### 新しいセッションの作成
```http
POST /api/sessions
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": ["server1", "server2"],
  "initialMessage": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### セッションの取得
```http
GET /api/chat-history/{sessionId}
```

#### セッションの更新
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### セッションの削除
```http
DELETE /api/chat-history/{sessionId}
```

### セッション検索とフィルタリング

#### セッションの検索
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

クエリパラメータ：
- `query`：タイトルまたはメッセージ内容の検索語
- `provider`：LLM プロバイダーによるフィルタリング（openai、deepseek、openrouter）
- `limit`：結果数（1-100、デフォルト：50）
- `offset`：ページネーションオフセット（デフォルト：0）
- `sortBy`：ソートフィールド（createdAt、updatedAt、title、デフォルト：updatedAt）
- `sortOrder`：ソート順序（asc、desc、デフォルト：desc）

### メッセージ管理

#### セッションにメッセージを追加
```http
POST /api/sessions/{sessionId}/messages
Content-Type: application/json

{
  "message": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### タイトル生成

#### セッションタイトルの生成
```http
POST /api/chat-history/{sessionId}/generate-title
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "your-api-key",
  "baseUrl": "https://api.openai.com/v1"
}
```

### 統計とメンテナンス

#### セッション統計の取得
```http
GET /api/sessions/stats
```

レスポンス：
```json
{
  "totalSessions": 150,
  "lastCleanup": "2024-01-01T00:00:00.000Z",
  "providerBreakdown": {
    "openai": 80,
    "deepseek": 50,
    "openrouter": 20
  },
  "averageMessagesPerSession": 12.5
}
```

#### セッションクリーンアップのトリガー
```http
POST /api/sessions/stats
```

レスポンス：
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## 設定

SessionManager は以下のパラメータで設定できます：

- `storageDir`：セッションストレージのディレクトリ（デフォルト：'./data/sessions'）
- `maxSessions`：保持する最大セッション数（デフォルト：1000）
- `cleanupIntervalMs`：自動クリーンアップ間隔（ミリ秒）（デフォルト：24時間）

## ストレージ形式

セッションは以下の構造で JSON 形式で保存されます：

```json
{
  "sessions": {
    "session_id": {
      "id": "session_id",
      "title": "Session Title",
      "messages": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "provider": "openai",
      "model": "gpt-4",
      "mcpServers": ["server1"]
    }
  },
  "metadata": {
    "lastCleanup": "2024-01-01T00:00:00.000Z",
    "totalSessions": 1
  }
}
```

## エラーハンドリング

このサービスは以下のエラータイプで構造化されたエラーハンドリングを使用します：

- `ValidationError`（400）：無効なリクエストパラメータ
- `NotFoundError`（404）：セッションが見つからない
- `InternalServerError`（500）：ストレージまたは処理エラー

## テスト

テストスイートを実行：

```bash
npm run test:run
```

テストカバレッジ：
- セッションの作成、取得、更新、削除
- セッション検索とフィルタリング
- タイトル生成（LLM とフォールバック）
- セッション統計
- エラーハンドリングシナリオ