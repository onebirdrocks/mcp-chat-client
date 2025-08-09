# 세션 관리 서비스

이 문서는 MCP Chat UI 백엔드에서 채팅 세션을 관리하기 위한 SessionManager 서비스와 API 엔드포인트를 설명합니다.

## SessionManager 기능

SessionManager는 포괄적인 세션 관리 기능을 제공합니다:

- **세션 저장소**: 파일 기반 저장소를 통한 채팅 세션의 영구 저장
- **세션 검색**: 개별 세션 가져오기 또는 여러 세션 검색/필터링
- **세션 정리**: 나이와 개수 제한에 따른 오래된 세션의 자동 정리
- **세션 검색**: 제목 또는 메시지 내용으로 세션 검색, 제공업체별 필터링
- **자동 제목 생성**: LLM 서비스를 사용한 세션 제목 생성
- **세션 통계**: 사용 통계 및 제공업체 분석 가져오기

## API 엔드포인트

### 세션 관리

#### 새 세션 생성
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

#### 세션 가져오기
```http
GET /api/chat-history/{sessionId}
```

#### 세션 업데이트
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### 세션 삭제
```http
DELETE /api/chat-history/{sessionId}
```

### 세션 검색 및 필터링

#### 세션 검색
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

쿼리 매개변수:
- `query`: 제목 또는 메시지 내용의 검색어
- `provider`: LLM 제공업체별 필터링 (openai, deepseek, openrouter)
- `limit`: 결과 수 (1-100, 기본값: 50)
- `offset`: 페이지네이션 오프셋 (기본값: 0)
- `sortBy`: 정렬 필드 (createdAt, updatedAt, title, 기본값: updatedAt)
- `sortOrder`: 정렬 순서 (asc, desc, 기본값: desc)

### 메시지 관리

#### 세션에 메시지 추가
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

### 제목 생성

#### 세션 제목 생성
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

### 통계 및 유지보수

#### 세션 통계 가져오기
```http
GET /api/sessions/stats
```

응답:
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

#### 세션 정리 트리거
```http
POST /api/sessions/stats
```

응답:
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## 구성

SessionManager는 다음 매개변수로 구성할 수 있습니다:

- `storageDir`: 세션 저장소 디렉토리 (기본값: './data/sessions')
- `maxSessions`: 유지할 최대 세션 수 (기본값: 1000)
- `cleanupIntervalMs`: 자동 정리 간격(밀리초) (기본값: 24시간)

## 저장소 형식

세션은 다음 구조로 JSON 형식으로 저장됩니다:

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

## 오류 처리

이 서비스는 다음 오류 유형으로 구조화된 오류 처리를 사용합니다:

- `ValidationError` (400): 잘못된 요청 매개변수
- `NotFoundError` (404): 세션을 찾을 수 없음
- `InternalServerError` (500): 저장소 또는 처리 오류

## 테스트

테스트 스위트 실행:

```bash
npm run test:run
```

테스트 커버리지:
- 세션 생성, 검색, 업데이트 및 삭제
- 세션 검색 및 필터링
- 제목 생성 (LLM 및 폴백)
- 세션 통계
- 오류 처리 시나리오