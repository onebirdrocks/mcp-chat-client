# Data Directory

This directory contains user data and application state. **All files in this directory are ignored by Git for security and privacy reasons.**

## Directory Structure

```
data/
├── settings/
│   ├── settings.json          # User settings and encrypted API keys (IGNORED)
│   └── settings.example.json  # Example settings structure
├── sessions/
│   ├── sessions.json          # Chat sessions and message history (IGNORED)
│   └── sessions.example.json  # Example sessions structure
└── logs/                      # Application logs (IGNORED)
```

## Security Notes

- **settings.json**: Contains encrypted API keys and user preferences. Never commit this file.
- **sessions.json**: Contains chat history and potentially sensitive conversation data. Never commit this file.
- **logs/**: May contain sensitive information from API calls and user interactions. Never commit log files.

## Setup

1. Copy the example files to create your initial configuration:
   ```bash
   cp settings.example.json settings.json
   cp sessions.example.json sessions.json
   ```

2. Configure your API keys through the application's settings interface.

3. The application will automatically create and manage these files during runtime.

## Backup

To backup your data:
- Use the application's export functionality for settings (excludes sensitive data)
- Chat history can be exported through the application interface
- For full backup, copy the entire `data/` directory to a secure location

## Privacy

This directory contains personal data including:
- API keys and credentials
- Chat conversations
- User preferences
- Usage logs

Ensure this directory is:
- Not committed to version control
- Backed up securely
- Protected with appropriate file permissions
- Excluded from any automated syncing services unless encrypted