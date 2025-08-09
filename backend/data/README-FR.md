# Répertoire de données

Ce répertoire contient les données utilisateur et l'état de l'application. **Tous les fichiers de ce répertoire sont ignorés par Git pour des raisons de sécurité et de confidentialité.**

## Structure du répertoire

```
data/
├── settings/
│   ├── settings.json          # Paramètres utilisateur et clés API chiffrées (IGNORÉ)
│   └── settings.example.json  # Structure d'exemple des paramètres
├── sessions/
│   ├── sessions.json          # Sessions de chat et historique des messages (IGNORÉ)
│   └── sessions.example.json  # Structure d'exemple des sessions
└── logs/                      # Journaux d'application (IGNORÉ)
```

## Notes de sécurité

- **settings.json** : Contient les clés API chiffrées et les préférences utilisateur. Ne jamais valider ce fichier.
- **sessions.json** : Contient l'historique des chats et des données de conversation potentiellement sensibles. Ne jamais valider ce fichier.
- **logs/** : Peut contenir des informations sensibles provenant des appels API et des interactions utilisateur. Ne jamais valider les fichiers de journaux.

## Configuration

1. Copiez les fichiers d'exemple pour créer votre configuration initiale :
   ```bash
   cp settings.example.json settings.json
   cp sessions.example.json sessions.json
   ```

2. Configurez vos clés API via l'interface de paramètres de l'application.

3. L'application créera et gérera automatiquement ces fichiers pendant l'exécution.

## Sauvegarde

Pour sauvegarder vos données :
- Utilisez la fonctionnalité d'exportation de l'application pour les paramètres (exclut les données sensibles)
- L'historique des chats peut être exporté via l'interface de l'application
- Pour une sauvegarde complète, copiez l'ensemble du répertoire `data/` vers un emplacement sécurisé

## Confidentialité

Ce répertoire contient des données personnelles incluant :
- Clés API et identifiants
- Conversations de chat
- Préférences utilisateur
- Journaux d'utilisation

Assurez-vous que ce répertoire soit :
- Non validé dans le contrôle de version
- Sauvegardé de manière sécurisée
- Protégé avec des permissions de fichiers appropriées
- Exclu de tout service de synchronisation automatisé sauf s'il est chiffré