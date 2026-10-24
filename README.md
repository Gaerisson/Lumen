<div align="center">

# ◒ Lumen

### Un bureau Windows qui vit au rythme de ta maison.

Horloge, mascotte Codex, maison connectée et ordinateurs distants — à la carte, sur plusieurs écrans.

![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-386b8c) ![Electron](https://img.shields.io/badge/Electron-45-668c99) ![Local first](https://img.shields.io/badge/Local-first-557a69) ![Version](https://img.shields.io/badge/version-7.1.0-8b789c)

**© 2026 Gaerisson · Vibecodé avec OpenAI Codex**

![Accueil Lumen, ambiance jour](docs/screens/home-day.jpg)

</div>

Lumen compose un bureau multi-écrans sans remplacer l’app Codex. Chaque fenêtre peut rester au premier plan, se réduire, passer en plein écran ou accueillir plusieurs éléments. Les positions sont mémorisées. Un raccourci libère immédiatement les écrans.

## Un écran utile, même au repos

| Maison & quotidien | Codex & ordinateurs |
| --- | --- |
| Horloge, météo et prévisions horaires | Quota session/semaine, crédits exposés par Codex |
| Puissance électrique avec source et fraîcheur | Mascotte active, au repos ou en recharge après quota |
| Sécurité, chambre et réveil | Projet courant, durée observée et commandes masquées des secrets connus |
| Personnes détectées : caméra à la demande | Graphiques CPU et RAM locaux ou distants |
| Réseau UniFi, NAS et Proxmox via HA | Partage distant authentifié, en lecture seule |
| Résumé du matin, voix et bulletin radio optionnels | Veille dans les fenêtres existantes, sans doublons |
| Spotify direct : appareils, volume et lecture | Modules indépendants et recherche de réglages |

![Ambiance nuit et mascotte en recharge](docs/screens/home-night.jpg)

## Modules & connecteurs

Active uniquement ce qui t’intéresse dans **Modules & PC distants**. Les connexions sont facultatives. Aucun serveur personnel, clé ou compte n’est fourni avec le projet.

- **Home Assistant** : API et flux WebSocket, recherche d’entités par nom, identifiant et unité. Les correspondances connues sont proposées et restent modifiables. Une mesure en VA n’est jamais présentée comme une puissance active en W.
- **Frigate / go2rtc** : détection de personnes, vidéo seulement lorsqu’elle est utile, restitution du format de la caméra, audio et bips configurables. Les flux masqués sont déchargés.
- **OpenAI Codex** : lecture du quota local par App Server, avec secours par les journaux locaux. Un PC distant peut fournir ces données sans partager son compte.
- **Lumen Remote** : CPU/RAM, quota et, en option, titres de projets. Les commandes, brouillons, clés HA et identifiants Codex ne traversent pas ce protocole.
- **Spotify Web API** : connexion guidée OAuth PKCE, pochette, titre, artiste, appareil, lecture/pause, précédent/suivant et volume. Les jetons sont chiffrés par Windows. La lecture s’effectue sur un appareil Spotify existant ; Lumen ne fournit pas de moteur de streaming.
- **Ubiquiti / UniFi, NAS et Proxmox** : capteurs exposés par Home Assistant ; les mesures indisponibles restent signalées comme telles.
- **Sleep as Android / ResMed myAir** : entités Home Assistant configurables, résumé de la dernière nuit et routines de réveil. La disponibilité dépend de ces intégrations.
- **Open-Meteo, RSS, NRJ, RFI, franceinfo** : météo, titres et bulletin radio facultatif. La voix Windows fonctionne localement ; Mistral nécessite sa propre clé et peut facturer les lectures.
- **Twinkle Tray** : réglage de luminosité sur les écrans compatibles, si activé et installé séparément.

![Réglages des modules](docs/screens/modules.jpg)

## Installer sur un autre PC

Télécharge l’archive Windows d’une version, extrais-la dans un dossier accessible en écriture, puis lance `Lumen.exe`. Il n’y a pas d’installateur système ni de droits administrateur nécessaires à l’app elle-même. Les paramètres et clés sont créés localement dans `data/`.

**Ne copie pas le dossier `data/` de ton PC principal.** Les secrets sont chiffrés pour le profil Windows d’origine. Connecte chaque PC et jumelle-les dans les options si nécessaire.

Le binaire Windows est actuellement non signé : la distribution publique est une version de développement. La signature de code et les mises à jour automatiques ne sont pas incluses.

### Quota et capteurs distants

1. Sur le PC qui héberge Codex, ouvre **Modules & PC distants** et génère une clé de jumelage.
2. Active le partage. Pour un autre PC, active aussi l’accès au réseau local et autorise uniquement les machines de confiance dans le pare-feu Windows.
3. Sur le PC client, ajoute l’adresse du PC hôte et sa clé. Choisis-le comme source du quota.
4. Ajoute d’autres PC de la même manière pour leurs capteurs CPU/RAM.

Le serveur écoute uniquement sur `127.1.0.1` par défaut ; le réseau local nécessite une option explicite. Le port par défaut est `32145`. Sur un réseau non fiable, utilise un VPN privé ou un reverse proxy HTTPS. Le protocole HTTP seul ne chiffre pas le transport. Aucun port du pare-feu n’est ouvert par Lumen.

Un **agent sans interface** fournit seulement les capteurs d’un PC équipé de Node.js :

```powershell
node agent.cjs --token-file C:\Private\lumen-pair.key --host 127.1.0.1 --port 32145
```

Depuis les sources, utilise la commande ci-dessus. Dans l’archive Windows, le point d’entrée est `resources/app/agent.cjs` ; Node.js reste nécessaire.

Crée un secret aléatoire d’au moins 32 caractères dans ce fichier privé. Pour le réseau local, choisis explicitement une adresse d’écoute adaptée. Les arguments du processus ne contiennent pas la clé.

### Connexion Spotify guidée

1. Active **Spotify** dans les modules et ouvre son assistant.
2. Crée une application dans le [tableau de bord Spotify Developer](https://developer.spotify.com/dashboard), avec l’API Web.
3. Enregistre exactement cette Redirect URI : **http://127.0.0.1:32146/callback**.
4. Copie le **Client ID public**, puis clique sur **Enregistrer et connecter Spotify**. Ne saisis jamais de Client Secret.
5. Autorise l’accès sur Spotify, puis vérifie la connexion dans Lumen. Ouvre Spotify sur un de tes appareils pour le voir apparaître.

Le contrôle requiert Premium. Les applications en mode développement restent soumises aux [limites Spotify](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide), notamment les utilisateurs autorisés. Lumen n’est pas une application Spotify approuvée pour une distribution étendue. [Documentation PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).

### Flash audio et préécoute

Dans **Audio & réveil**, choisis NRJ, RFI, franceinfo ou un podcast RSS personnel. Le dernier bulletin récent est sélectionné, avec volume, vitesse et durée maximale réglables. Les publicités éventuelles dépendent des radios. **Flash local** lit les titres RSS avec la voix Windows, sans publicité ajoutée par Lumen. Les aperçus sont limités à 20 secondes et possèdent un bouton d’arrêt. La voix Mistral exige une action explicite avant un aperçu facturable.

Lumen affiche l’activité Codex en lecture seule. La reprise automatique des chats a été retirée : aucun message de reprise n’est envoyé.

## Performances & contrôle

- Mode économe par défaut : fond statique, petites animations conservées.
- Écrans masqués : minuteries et animations suspendues. La veille réutilise les fenêtres existantes et restaure leurs positions.
- Caméras inutilisées : document vidéo déchargé, connexions et décodage arrêtés.
- Événements HA regroupés ; historiques et nœuds DOM réutilisés.
- Graphiques stables entre deux mesures, valeurs numériques alignées.
- Thèmes noir/blanc automatiques selon lumière et soleil, avec horaires de secours.
- Réduction des animations système respectée.

**Ctrl + Alt + Espace** libère les écrans. **Ctrl + Alt + L** ouvre les réglages. Les fenêtres restent réductibles ; Lumen ne verrouille pas le bureau.

## Développer

Pré-requis : Windows, Node.js 24 et npm. Dépendances verrouillées dans `package-lock.json`.

```powershell
npm ci
npm test
npm start
```

Pour isoler le profil de développement : définis `LUMEN_DATA_DIR` vers un dossier privé. Pour produire une version portable :

```powershell
node build.js
```

Sortie : `dist/Lumen/`. `LUMEN_OUTPUT` permet de choisir une autre destination ; `--update` met à jour un dossier existant après fermeture de Lumen. Les profils utilisateurs ne doivent jamais être ajoutés à une archive de distribution.

Validation native, avec profils et services simulés :

```powershell
npm run smoke
npx electron . --home-screen-test
npx electron . --performance-test
```

Les tests ne déclenchent aucune vraie alarme et ne règlent pas la luminosité matérielle. Le protocole remote est testé sur la boucle locale ; une seconde machine physique n’a pas encore servi à la validation.

## Organisation

`modules.js` décrit les connecteurs ; `modules-settings.js` leurs options. `home-assistant.js` collecte les états, `power-reading.js` normalise la puissance, `remote.js` expose le partage limité, `telemetry.js` mesure CPU/RAM, `spotify.js` gère OAuth et l’API Spotify. `live-dom.js` préserve les éléments visuels lors des actualisations.

Consulte [SECURITY.md](SECURITY.md) pour la protection des données et [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) pour les crédits.

Lumen est un projet indépendant de Gaerisson, vibecodé avec OpenAI Codex. Les noms et marques des connecteurs appartiennent à leurs propriétaires respectifs. Aucune affiliation officielle n’est revendiquée. © 2026 Gaerisson. Tous droits réservés sur le code original ; voir [LICENSE](LICENSE).
