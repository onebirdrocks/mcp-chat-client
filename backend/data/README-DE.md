# Datenverzeichnis

Dieses Verzeichnis enthält Benutzerdaten und den Anwendungszustand. **Alle Dateien in diesem Verzeichnis werden aus Sicherheits- und Datenschutzgründen von Git ignoriert.**

## Verzeichnisstruktur

```
data/
├── settings/
│   ├── settings.json          # Benutzereinstellungen und verschlüsselte API-Schlüssel (IGNORIERT)
│   └── settings.example.json  # Beispiel-Einstellungsstruktur
├── sessions/
│   ├── sessions.json          # Chat-Sitzungen und Nachrichtenverlauf (IGNORIERT)
│   └── sessions.example.json  # Beispiel-Sitzungsstruktur
└── logs/                      # Anwendungsprotokolle (IGNORIERT)
```

## Sicherheitshinweise

- **settings.json**: Enthält verschlüsselte API-Schlüssel und Benutzereinstellungen. Diese Datei niemals committen.
- **sessions.json**: Enthält Chat-Verlauf und potenziell sensible Gesprächsdaten. Diese Datei niemals committen.
- **logs/**: Kann sensible Informationen aus API-Aufrufen und Benutzerinteraktionen enthalten. Protokolldateien niemals committen.

## Einrichtung

1. Kopieren Sie die Beispieldateien, um Ihre anfängliche Konfiguration zu erstellen:
   ```bash
   cp settings.example.json settings.json
   cp sessions.example.json sessions.json
   ```

2. Konfigurieren Sie Ihre API-Schlüssel über die Einstellungsoberfläche der Anwendung.

3. Die Anwendung wird diese Dateien während der Laufzeit automatisch erstellen und verwalten.

## Sicherung

Um Ihre Daten zu sichern:
- Verwenden Sie die Exportfunktion der Anwendung für Einstellungen (schließt sensible Daten aus)
- Chat-Verlauf kann über die Anwendungsoberfläche exportiert werden
- Für eine vollständige Sicherung kopieren Sie das gesamte `data/`-Verzeichnis an einen sicheren Ort

## Datenschutz

Dieses Verzeichnis enthält persönliche Daten einschließlich:
- API-Schlüssel und Anmeldedaten
- Chat-Gespräche
- Benutzereinstellungen
- Nutzungsprotokolle

Stellen Sie sicher, dass dieses Verzeichnis:
- Nicht in die Versionskontrolle committet wird
- Sicher gesichert wird
- Mit angemessenen Dateiberechtigungen geschützt wird
- Von automatischen Synchronisierungsdiensten ausgeschlossen wird, es sei denn, es ist verschlüsselt