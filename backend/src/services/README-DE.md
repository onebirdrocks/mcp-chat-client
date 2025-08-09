# Session-Management-Service

Dieses Dokument beschreibt den SessionManager-Service und seine API-Endpunkte für die Verwaltung von Chat-Sessions im MCP Chat UI Backend.

## SessionManager-Funktionen

Der SessionManager bietet umfassende Session-Management-Funktionen:

- **Session-Speicherung**: Persistente Speicherung von Chat-Sessions mit dateibasierter Speicherung
- **Session-Abruf**: Einzelne Sessions abrufen oder mehrere Sessions suchen/filtern
- **Session-Bereinigung**: Automatische Bereinigung alter Sessions basierend auf Alter und Anzahlbegrenzungen
- **Session-Suche**: Sessions nach Titel oder Nachrichteninhalt suchen, nach Anbieter filtern
- **Automatische Titelgenerierung**: Session-Titel mit LLM-Services generieren
- **Session-Statistiken**: Nutzungsstatistiken und Anbieteraufschlüsselungen abrufen

## API-Endpunkte

### Session-Management

#### Neue Session erstellen
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

#### Session abrufen
```http
GET /api/chat-history/{sessionId}
```

#### Session aktualisieren
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### Session löschen
```http
DELETE /api/chat-history/{sessionId}
```

### Session-Suche und -Filterung

#### Sessions suchen
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

Query-Parameter:
- `query`: Suchbegriff für Titel oder Nachrichteninhalt
- `provider`: Nach LLM-Anbieter filtern (openai, deepseek, openrouter)
- `limit`: Anzahl der Ergebnisse (1-100, Standard: 50)
- `offset`: Paginierungs-Offset (Standard: 0)
- `sortBy`: Sortierfeld (createdAt, updatedAt, title, Standard: updatedAt)
- `sortOrder`: Sortierreihenfolge (asc, desc, Standard: desc)

### Nachrichten-Management

#### Nachricht zur Session hinzufügen
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

### Titelgenerierung

#### Session-Titel generieren
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

### Statistiken und Wartung

#### Session-Statistiken abrufen
```http
GET /api/sessions/stats
```

Antwort:
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

#### Session-Bereinigung auslösen
```http
POST /api/sessions/stats
```

Antwort:
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## Konfiguration

Der SessionManager kann mit den folgenden Parametern konfiguriert werden:

- `storageDir`: Verzeichnis für Session-Speicherung (Standard: './data/sessions')
- `maxSessions`: Maximale Anzahl der zu behaltenden Sessions (Standard: 1000)
- `cleanupIntervalMs`: Automatisches Bereinigungsintervall in Millisekunden (Standard: 24 Stunden)

## Speicherformat

Sessions werden im JSON-Format mit der folgenden Struktur gespeichert:

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

## Fehlerbehandlung

Der Service verwendet strukturierte Fehlerbehandlung mit den folgenden Fehlertypen:

- `ValidationError` (400): Ungültige Anfrageparameter
- `NotFoundError` (404): Session nicht gefunden
- `InternalServerError` (500): Speicher- oder Verarbeitungsfehler

## Testen

Test-Suite ausführen mit:

```bash
npm run test:run
```

Die Tests decken ab:
- Session-Erstellung, -Abruf, -Aktualisierung und -Löschung
- Session-Suche und -Filterung
- Titelgenerierung (LLM und Fallback)
- Session-Statistiken
- Fehlerbehandlungsszenarien