# API-Endpunkt-Dokumentation

Dieses Dokument beschreibt die API-Endpunkte, die für das MCP Chat UI Backend implementiert wurden.

## Einstellungs-Endpunkte

### GET/POST/PUT /api/settings

Verwaltet Anwendungseinstellungen einschließlich LLM-Anbieter-Konfigurationen, MCP-Server-Konfigurationen und Benutzereinstellungen.

**GET /api/settings**
- Gibt die aktuelle Einstellungskonfiguration zurück
- Antwort: `Settings`-Objekt mit `llmProviders`, `mcpServers` und `preferences`

**POST /api/settings**
- Erstellt oder aktualisiert die Einstellungskonfiguration
- Request Body: Partielles `Settings`-Objekt
- Antwort: Aktualisiertes `Settings`-Objekt

**PUT /api/settings**
- Aktualisiert die Einstellungskonfiguration (gleich wie POST)
- Request Body: Partielles `Settings`-Objekt
- Antwort: Aktualisiertes `Settings`-Objekt

**Beispiel-Antwort:**
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

## Chat-Verlauf-Endpunkte

### GET /api/chat-history

Ruft den Chat-Session-Verlauf mit optionaler Filterung und Paginierung ab.

**Query-Parameter:**
- `limit` (optional): Anzahl der zurückzugebenden Sessions (1-100, Standard: 50)
- `offset` (optional): Anzahl der zu überspringenden Sessions (Standard: 0)
- `query` (optional): Suchanfrage für Session-Titel/Inhalte
- `provider` (optional): Nach LLM-Anbieter filtern
- `sortBy` (optional): Sortierfeld ('createdAt', 'updatedAt', 'title', Standard: 'updatedAt')
- `sortOrder` (optional): Sortierreihenfolge ('asc', 'desc', Standard: 'desc')

**Antwort:**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "Test-Session",
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

Löscht eine Chat-Session.

**Query-Parameter:**
- `sessionId` (erforderlich): ID der zu löschenden Session

**Antwort:**
```json
{
  "success": true
}
```

### PUT /api/chat-history

Aktualisiert eine Chat-Session (z.B. umbenennen).

**Query-Parameter:**
- `sessionId` (erforderlich): ID der zu aktualisierenden Session

**Request Body:**
```json
{
  "title": "Neuer Session-Titel"
}
```

**Antwort:**
```json
{
  "id": "session-1",
  "title": "Neuer Session-Titel",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Einzelne Session-Endpunkte

### GET /api/chat-history/[sessionId]

Ruft eine vollständige Chat-Session mit allen Nachrichten ab.

**Antwort:**
```json
{
  "id": "session-1",
  "title": "Test-Session",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

Aktualisiert eine spezifische Chat-Session.

**Request Body:**
```json
{
  "title": "Aktualisierter Titel",
  "messages": [] // Optional: Nachrichten aktualisieren
}
```

### DELETE /api/chat-history/[sessionId]

Löscht eine spezifische Chat-Session.

**Antwort:**
```json
{
  "success": true
}
```

## Fehlerbehandlung

Alle Endpunkte verwenden konsistente Fehlerbehandlung:

- **400 Bad Request**: Validierungsfehler, ungültige Parameter
- **404 Not Found**: Session nicht gefunden
- **500 Internal Server Error**: Server-Fehler

**Fehler-Antwort-Format:**
```json
{
  "error": "ValidationError",
  "message": "Detaillierte Fehlermeldung",
  "statusCode": 400
}
```

## CORS-Unterstützung

Alle Endpunkte enthalten CORS-Header für die lokale Entwicklung:
- Erlaubte Origins: `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`
- Erlaubte Methoden: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- Anmeldedaten unterstützt: `true`

## Erfüllte Anforderungen

Diese Implementierung erfüllt die folgenden Anforderungen:

- **2.2**: API-Anmeldedaten-Speicherung - Einstellungs-Endpunkte verwalten LLM-Anbieter-Konfigurationen mit sicherer API-Schlüssel-Speicherung
- **7.2**: Verschlüsselte Speicherung - API-Schlüssel werden sicher im lokalen Browser-Speicher gespeichert (Frontend-Verantwortung)
- **9.2**: Liste der Gespräche anzeigen - GET /api/chat-history gibt paginierte Session-Liste zurück
- **9.3**: Vollständiges Gespräch laden - GET /api/chat-history/[sessionId] gibt vollständige Session mit Nachrichten zurück
- **9.4**: Gespräche umbenennen, löschen, archivieren - PUT- und DELETE-Endpunkte unterstützen Session-Management-Operationen