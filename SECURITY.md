# Données et sécurité

Les paramètres utilisateurs, captures personnelles, bases locales, journaux, clés de jumelage et tokens ne font pas partie du dépôt ou des archives publiques.

- Home Assistant, Mistral, les jetons Spotify et les clés de jumelage utilisent Electron safeStorage et le profil Windows local.
- Les pages web intégrées ne reçoivent pas ces clés : contexte isolé, sandbox et accès IPC réservé aux vues locales connues.
- La copie des clés de partage passe par le presse-papiers natif depuis l’atelier, sans transmettre la clé au rendu. La permission Clipboard des pages web reste refusée.
- Le partage remote expose uniquement `/v1/status`, en GET et avec une clé aléatoire longue. Il ne permet aucune commande shell ou action sur la maison. Les requêtes de pages web avec Origin sont refusées.
- La découverte UDP 32146 répond uniquement quand le partage LAN et sa visibilité sont activés. L’annonce se limite à l’identité Lumen, au nom du PC, à sa version et au port HTTP. Aucun quota, projet ou secret n’est envoyé sans authentification. Le partage reste désactivé sur une installation neuve.
- Le partage des titres de projets est optionnel. Commandes, mises à jour textuelles, chemins locaux, clés HA, tokens Codex et jetons Spotify sont exclus du flux remote.
- L’app ne désactive ni le pare-feu ni la validation TLS. HTTP ne chiffre pas les échanges : un VPN privé ou HTTPS est nécessaire hors réseau de confiance.
- Les commandes d’alarme existantes conservent une confirmation. Les actions musicales explicites passent par l’API Spotify et les appareils du compte autorisé.
- La connexion Spotify utilise PKCE et un callback limité à la boucle locale, avec vérification de l’état OAuth. Aucun Client Secret n’est demandé.
- Le suivi Codex est en lecture seule. Aucun message automatique n’est envoyé aux chats.

Ne publie jamais `data/`, les profils `*-data/`, `.env`, les fichiers de clés, les diagnostics réels ou des captures de ton domicile. Les captures de ce dépôt utilisent des données de démonstration.

Pour signaler un problème, n’inclus aucune clé ou donnée privée dans une issue publique. Décris le composant et un exemple fictif reproductible.
