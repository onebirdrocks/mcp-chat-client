# API 엔드포인트 문서

이 문서는 MCP Chat UI 백엔드에 구현된 API 엔드포인트를 설명합니다.

## 설정 엔드포인트

### GET/POST/PUT /api/settings

LLM 제공자 구성, MCP 서버 구성 및 사용자 기본 설정을 포함한 애플리케이션 설정을 관리합니다.

**GET /api/settings**
- 현재 설정 구성을 반환합니다
- 응답: `llmProviders`, `mcpServers`, `preferences`를 포함하는 `Settings` 객체

**POST /api/settings**
- 설정 구성을 생성하거나 업데이트합니다
- 요청 본문: 부분 `Settings` 객체
- 응답: 업데이트된 `Settings` 객체

**PUT /api/settings**
- 설정 구성을 업데이트합니다 (POST와 동일)
- 요청 본문: 부분 `Settings` 객체
- 응답: 업데이트된 `Settings` 객체

**응답 예시:**
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

## 채팅 기록 엔드포인트

### GET /api/chat-history

선택적 필터링 및 페이지네이션을 사용하여 채팅 세션 기록을 검색합니다.

**쿼리 매개변수:**
- `limit` (선택사항): 반환할 세션 수 (1-100, 기본값: 50)
- `offset` (선택사항): 건너뛸 세션 수 (기본값: 0)
- `query` (선택사항): 세션 제목/내용에 대한 검색 쿼리
- `provider` (선택사항): LLM 제공자로 필터링
- `sortBy` (선택사항): 정렬 필드 ('createdAt', 'updatedAt', 'title', 기본값: 'updatedAt')
- `sortOrder` (선택사항): 정렬 순서 ('asc', 'desc', 기본값: 'desc')

**응답:**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "테스트 세션",
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

채팅 세션을 삭제합니다.

**쿼리 매개변수:**
- `sessionId` (필수): 삭제할 세션의 ID

**응답:**
```json
{
  "success": true
}
```

### PUT /api/chat-history

채팅 세션을 업데이트합니다 (예: 이름 변경).

**쿼리 매개변수:**
- `sessionId` (필수): 업데이트할 세션의 ID

**요청 본문:**
```json
{
  "title": "새 세션 제목"
}
```

**응답:**
```json
{
  "id": "session-1",
  "title": "새 세션 제목",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 개별 세션 엔드포인트

### GET /api/chat-history/[sessionId]

모든 메시지가 포함된 완전한 채팅 세션을 검색합니다.

**응답:**
```json
{
  "id": "session-1",
  "title": "테스트 세션",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

특정 채팅 세션을 업데이트합니다.

**요청 본문:**
```json
{
  "title": "업데이트된 제목",
  "messages": [] // 선택사항: 메시지 업데이트
}
```

### DELETE /api/chat-history/[sessionId]

특정 채팅 세션을 삭제합니다.

**응답:**
```json
{
  "success": true
}
```

## 오류 처리

모든 엔드포인트는 일관된 오류 처리를 사용합니다:

- **400 Bad Request**: 유효성 검사 오류, 잘못된 매개변수
- **404 Not Found**: 세션을 찾을 수 없음
- **500 Internal Server Error**: 서버 오류

**오류 응답 형식:**
```json
{
  "error": "ValidationError",
  "message": "상세한 오류 메시지",
  "statusCode": 400
}
```

## CORS 지원

모든 엔드포인트는 로컬 개발을 위한 CORS 헤더를 포함합니다:
- 허용된 출처: `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`
- 허용된 메서드: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- 자격 증명 지원: `true`

## 충족된 요구사항

이 구현은 다음 요구사항을 충족합니다:

- **2.2**: API 자격 증명 저장 - 설정 엔드포인트는 안전한 API 키 저장을 통한 LLM 제공자 구성을 관리
- **7.2**: 암호화된 저장 - API 키는 로컬 브라우저 저장소에 안전하게 저장됨 (프론트엔드 책임)
- **9.2**: 대화 목록 표시 - GET /api/chat-history는 페이지네이션된 세션 목록을 반환
- **9.3**: 완전한 대화 로드 - GET /api/chat-history/[sessionId]는 메시지가 포함된 전체 세션을 반환
- **9.4**: 대화 이름 변경, 삭제, 보관 - PUT 및 DELETE 엔드포인트는 세션 관리 작업을 지원