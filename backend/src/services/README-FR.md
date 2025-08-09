# Service de Gestion de Session

Ce document décrit le service SessionManager et ses points de terminaison API pour gérer les sessions de chat dans le backend MCP Chat UI.

## Fonctionnalités du SessionManager

Le SessionManager fournit des capacités complètes de gestion de session :

- **Stockage de Session** : Stockage persistant des sessions de chat avec stockage basé sur fichiers
- **Récupération de Session** : Obtenir des sessions individuelles ou rechercher/filtrer plusieurs sessions
- **Nettoyage de Session** : Nettoyage automatique des anciennes sessions basé sur l'âge et les limites de nombre
- **Recherche de Session** : Rechercher des sessions par titre ou contenu de message, filtrer par fournisseur
- **Génération Automatique de Titre** : Générer des titres de session en utilisant les services LLM
- **Statistiques de Session** : Obtenir des statistiques d'utilisation et des répartitions par fournisseur

## Points de Terminaison API

### Gestion de Session

#### Créer une Nouvelle Session
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

#### Obtenir une Session
```http
GET /api/chat-history/{sessionId}
```

#### Mettre à Jour une Session
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### Supprimer une Session
```http
DELETE /api/chat-history/{sessionId}
```

### Recherche et Filtrage de Session

#### Rechercher des Sessions
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

Paramètres de Requête :
- `query` : Terme de recherche pour le titre ou le contenu du message
- `provider` : Filtrer par fournisseur LLM (openai, deepseek, openrouter)
- `limit` : Nombre de résultats (1-100, défaut : 50)
- `offset` : Décalage de pagination (défaut : 0)
- `sortBy` : Champ de tri (createdAt, updatedAt, title, défaut : updatedAt)
- `sortOrder` : Ordre de tri (asc, desc, défaut : desc)

### Gestion des Messages

#### Ajouter un Message à la Session
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

### Génération de Titre

#### Générer un Titre de Session
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

### Statistiques et Maintenance

#### Obtenir les Statistiques de Session
```http
GET /api/sessions/stats
```

Réponse :
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

#### Déclencher le Nettoyage de Session
```http
POST /api/sessions/stats
```

Réponse :
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## Configuration

Le SessionManager peut être configuré avec les paramètres suivants :

- `storageDir` : Répertoire pour le stockage de session (défaut : './data/sessions')
- `maxSessions` : Nombre maximum de sessions à conserver (défaut : 1000)
- `cleanupIntervalMs` : Intervalle de nettoyage automatique en millisecondes (défaut : 24 heures)

## Format de Stockage

Les sessions sont stockées au format JSON avec la structure suivante :

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

## Gestion des Erreurs

Le service utilise une gestion d'erreur structurée avec les types d'erreur suivants :

- `ValidationError` (400) : Paramètres de requête invalides
- `NotFoundError` (404) : Session non trouvée
- `InternalServerError` (500) : Erreurs de stockage ou de traitement

## Tests

Exécuter la suite de tests avec :

```bash
npm run test:run
```

Les tests couvrent :
- Création, récupération, mise à jour et suppression de session
- Recherche et filtrage de session
- Génération de titre (LLM et fallback)
- Statistiques de session
- Scénarios de gestion d'erreur