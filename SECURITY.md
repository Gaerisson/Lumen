# Données et sécurité

Les paramètres utilisateurs, captures personnelles, bases locales, journaux, clés de jumelage et tokens ne font pas partie du dépôt ou des archives publiques.

- Home Assistant, Mistral et les clés de jumelage utilisent Electron safeStorage et le profil Windows local.
- Les pages web intégrées ne reçoivent pas ces clés : contexte isolé, sandbox et accès IPC réservé aux vues locales connues.
- Le partage remote expose uniquement `/v1/status`, en GET et avec une clé aléatoire longue. Il ne permet aucune commande shell ou action sur la maison. Les requêtes de pages web avec Origin sont refusées.
- Le partage des titres de projets est optionnel. Commandes, mises à jour textuelles, chemins locaux, clés HA, tokens Codex et messages préparés sont exclus du flux remote.
- L’app ne désactive ni le pare-feu ni la validation TLS. HTTP ne chiffre pas les échanges : un VPN privé ou HTTPS est nécessaire hors réseau de confiance.
- Les commandes d’alarme existantes conservent une confirmation. Les actions musicales explicites portent uniquement sur le lecteur configuré.
- La reprise Codex est locale et explicite, avec déduplication persistante. Elle conserve les règles du projet et refuse les demandes d’approbation non gérées par le client.

Ne publie jamais `data/`, les profils `*-data/`, `.env`, les fichiers de clés, les diagnostics réels ou des captures de ton domicile. Les captures de ce dépôt utilisent des données de démonstration.

Pour signaler un problème, n’inclus aucune clé ou donnée privée dans une issue publique. Décris le composant et un exemple fictif reproductible.
