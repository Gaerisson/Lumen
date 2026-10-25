# Lumen 8.2 · © Gaerisson

Vibecodé avec OpenAI Codex.

Extrais toute l’archive dans un dossier accessible en écriture, puis lance Lumen.exe. Une installation neuve ouvre seulement la bienvenue : le guide connecte les services et aide à choisir les capteurs et les écrans. Le studio permet de placer et redimensionner les modules à la souris. [Le tutoriel détaillé](setup.md) explique le parcours.

Ctrl+Alt+L ouvre les réglages ; Ctrl+Alt+Espace libère les écrans. Les fenêtres sont réductibles et leurs positions sont mémorisées. Une installation existante conserve ses panneaux.

Services & modules permet de choisir les connecteurs, le mode économe, les thèmes automatiques et le partage du quota/CPU/RAM. Le serveur est désactivé par défaut, avec une clé de jumelage locale chiffrée.

Pour un autre PC, extrais une archive propre. Ne transfère pas data/ : les clés sont liées au profil Windows. Connecte Home Assistant ou jumelle le PC Codex dans Connexions → PC distants ([guide](remote.md)).

Spotify se connecte directement avec un assistant dans Services & modules. Il faut créer une application Spotify et renseigner son Client ID public, jamais de Client Secret. Les jetons sont chiffrés localement. La reprise automatique Codex est retirée.

Audio & réveil propose NRJ, RFI, franceinfo, un podcast personnel ou un flash lu localement, avec préécoute des flux et de la voix. Les écrans de l’alarme, du réveil, du résumé et des détections sont sélectionnables séparément dans Connexions. La veille utilise les fenêtres existantes pour éviter les doublons dans la barre des tâches.

Les mises à jour sont recherchées sur GitHub, téléchargées et vérifiées automatiquement. L’installation peut se faire à la fermeture, ou manuellement depuis Connexions. Ces deux automatismes sont désactivables. Les clés et réglages de data/ sont conservés.

[README.md](../README.md) détaille les modules, les limites, l’installation et le développement. [SECURITY.md](../SECURITY.md) explique le partage distant. Les marques des connecteurs appartiennent à leurs détenteurs, sans affiliation officielle.
