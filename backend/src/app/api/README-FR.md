# Documentation des Points de Terminaison API

Ce document décrit les points de terminaison API implémentés pour le backend MCP Chat UI.

## Points de Terminaison des Paramètres

### GET/POST/PUT /api/settings

Gère les paramètres de l'application, y compris les configurations des fournisseurs LLM, les configurations des serveurs MCP et les préférences utilisateur.

**GET /api/settings**
- Retourne la configuration actuelle des paramètres
- Réponse : Objet `Settings` avec `llmProviders`, `mcpServers` et `preferences`

**POST /api/settings**
- Crée ou met à jour la configuration des paramètres
- Corps de la requête : Objet `Settings` partiel
- Réponse : Objet `Settings` mis à jour

**PUT /api/settings**
- Met à jour la configuration des paramètres (identique à POST)
- Corps de la requête : Objet `Settings` partiel
- Réponse : Objet `Settings` mis à jour

**Exemple de Réponse :**
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

## Points de Terminaison de l'Historique de Chat

### GET /api/chat-history

Récupère l'historique des sessions de chat avec filtrage et pagination optionnels.

**Paramètres de Requête :**
- `limit` (optionnel) : Nombre de sessions à retourner (1-100, défaut : 50)
- `offset` (optionnel) : Nombre de sessions à ignorer (défaut : 0)
- `query` (optionnel) : Requête de recherche pour les titres/contenus de session
- `provider` (optionnel) : Filtrer par fournisseur LLM
- `sortBy` (optionnel) : Champ de tri ('createdAt', 'updatedAt', 'title', défaut : 'updatedAt')
- `sortOrder` (optionnel) : Ordre de tri ('asc', 'desc', défaut : 'desc')

**Réponse :**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "Session de Test",
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

Supprime une session de chat.

**Paramètres de Requête :**
- `sessionId` (requis) : ID de la session à supprimer

**Réponse :**
```json
{
  "success": true
}
```

### PUT /api/chat-history

Met à jour une session de chat (par exemple, renommer).

**Paramètres de Requête :**
- `sessionId` (requis) : ID de la session à mettre à jour

**Corps de la Requête :**
```json
{
  "title": "Nouveau Titre de Session"
}
```

**Réponse :**
```json
{
  "id": "session-1",
  "title": "Nouveau Titre de Session",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Points de Terminaison de Session Individuelle

### GET /api/chat-history/[sessionId]

Récupère une session de chat complète avec tous les messages.

**Réponse :**
```json
{
  "id": "session-1",
  "title": "Session de Test",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

Met à jour une session de chat spécifique.

**Corps de la Requête :**
```json
{
  "title": "Titre Mis à Jour",
  "messages": [] // Optionnel : mettre à jour les messages
}
```

### DELETE /api/chat-history/[sessionId]

Supprime une session de chat spécifique.

**Réponse :**
```json
{
  "success": true
}
```

## Gestion des Erreurs

Tous les points de terminaison utilisent une gestion d'erreur cohérente :

- **400 Bad Request** : Erreurs de validation, paramètres invalides
- **404 Not Found** : Session non trouvée
- **500 Internal Server Error** : Erreurs serveur

**Format de Réponse d'Erreur :**
```json
{
  "error": "ValidationError",
  "message": "Message d'erreur détaillé",
  "statusCode": 400
}
```

## Support CORS

Tous les points de terminaison incluent des en-têtes CORS pour le développement local :
- Origines autorisées : `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`
- Méthodes autorisées : `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- Identifiants supportés : `true`

## Exigences Satisfaites

Cette implémentation satisfait les exigences suivantes :

- **2.2** : Stockage des identifiants API - Les points de terminaison des paramètres gèrent les configurations des fournisseurs LLM avec stockage sécurisé des clés API
- **7.2** : Stockage chiffré - Les clés API sont stockées de manière sécurisée dans le stockage local du navigateur (responsabilité du frontend)
- **9.2** : Afficher la liste des conversations - GET /api/chat-history retourne une liste de sessions paginée
- **9.3** : Charger une conversation complète - GET /api/chat-history/[sessionId] retourne une session complète avec les messages
- **9.4** : Renommer, supprimer, archiver les conversations - Les points de terminaison PUT et DELETE supportent les opérations de gestion de session