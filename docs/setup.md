# Première ouverture et studio

Sur une installation neuve, Lumen ouvre uniquement son guide de bienvenue. Les services, sons, alertes et automatismes sont facultatifs. Une installation existante conserve ses panneaux et associations.

1. **Connexions** — renseigne l’adresse de Home Assistant et un jeton longue durée créé dans ton profil HA. « Connecter » vérifie la lecture des entités avant d’enregistrer le jeton chiffré. UniFi, NAS, Proxmox et ResMed passent par leurs intégrations HA.
2. **Capteurs** — recherche par nom, identifiant, unité ou intégration. Les suggestions ne limitent pas la liste : toutes les entités remontées sont sélectionnables. Les champs à plusieurs entités utilisent des étiquettes faciles à retirer.
3. **Caméras** — renseigne Frigate et son serveur go2rtc accessible depuis ce PC. Les noms des caméras sont détectés ; les URL RTSP et mots de passe restent dans Frigate. Sélectionne les caméras à ouvrir sur une détection de personne.
4. **Écrans** — choisis un premier panneau et les destinations indépendantes de l’intrusion, du réveil, du résumé et des détections. Recherche une ville pour la météo. Le guide peut être relancé en conservant la disposition existante.
5. **Studio** — sélectionne un écran, ajoute un panneau puis clique ou glisse un module depuis la palette. Déplace les cartes et tire leur coin pour les redimensionner. « Enregistrer & afficher » applique la disposition. Le module Caméra propose les caméras Frigate en direct, muettes par défaut ; les vidéos masquées sont suspendues.

La navigation principale propose **Mon studio**, **Connexions**, **Apparence**. Les réglages détaillés restent dans **Réglages avancés**, avec une recherche. `Ctrl+Alt+L` ouvre les réglages ; `Ctrl+Alt+Espace` masque les panneaux.

## Composer plus facilement

Le studio compose le **contenu d’une fenêtre Lumen**, pas le bureau Windows. Choisis d’abord l’écran physique, puis la fenêtre dans la liste. Le cadre intitulé « Contenu de la fenêtre » montre uniquement ses modules, avec les proportions de cette fenêtre. « Plein écran » utilise les proportions du moniteur. Plusieurs fenêtres peuvent partager un écran.

Clique sur une carte pour ouvrir ses options sous l’aperçu : titre et présentation compacte ou détaillée. **Proxmox** propose tout, nœuds, VM et CT, VM seules, CT seuls ou sauvegardes. Choisis les métriques CPU, mémoire, disque, état et sauvegarde, ou sélectionne précisément les entités dans Home Assistant. Ces choix s’appliquent à cette carte ; une autre carte peut afficher une autre vue du même serveur.

Le type VM / CT provient des appareils de l’intégration Home Assistant. Les intégrations plus anciennes peuvent ne pas préciser ce type : la vue « VM et conteneurs » et la sélection d’entités permettent de limiter l’affichage. Les données manquantes restent indiquées comme indisponibles. Certaines [entités Proxmox, dont les sauvegardes](https://www.home-assistant.io/integrations/proxmoxve/), doivent être activées dans Home Assistant.

**Ordinateurs** choisit un PC ou tous les PC. **NAS** filtre les entités exposées par le connecteur. **Actualités** choisit le nombre de titres. Le [guide PC distants](remote.md) explique le partage, la recherche réseau et les erreurs de jumelage.

Les boutons ↶ / ↷ et `Ctrl+Z` / `Ctrl+Y` annulent ou rétablissent les changements avant sauvegarde. Les flèches déplacent la carte sélectionnée ; `Maj` augmente le pas. `Suppr` retire une carte. **Répartir** organise les cartes sans chevauchement. Le sélecteur Écran déplace un panneau sur un autre moniteur.

**Mes capteurs** permet de choisir jusqu’à huit entités Home Assistant dans la liste du studio. Un module peut montrer une température, un niveau de batterie, une mesure électrique ou un autre état. Les courbes restent locales et ne sont collectées que pour les capteurs sélectionnés. Une entité supprimée ou indisponible est signalée, sans valeur inventée.

**État des services** aide à distinguer une connexion manquante d’un module désactivé. Il réutilise les relevés existants et ne lance aucun test réseau supplémentaire.

La sauvegarde du studio conserve les fenêtres inchangées et la connexion Home Assistant. Elle active les connecteurs des modules nouvellement ajoutés ; déplacer une carte existante respecte tes choix de désactivation.

## Mises à jour automatiques

La version Windows portable vérifie les versions stables de `Gaerisson/Lumen` sur GitHub. Elle télécharge l’archive Windows et contrôle son SHA-256 publié par GitHub avant de la préparer. Les réglages dans **Connexions** permettent de désactiver le téléchargement ou l’installation à la fermeture, de vérifier manuellement et d’installer une version prête immédiatement.

La recherche commence quelques secondes après le lancement, puis revient toutes les **10 minutes**. Une erreur réseau est réessayée après 1, 2, 5 puis 10 minutes, en respectant les délais imposés par GitHub. Au retour d’une veille ou d’une connexion, une recherche est anticipée si le dernier essai date de plus de deux minutes. Réactiver l’option démarre une recherche immédiatement.

Une **notification silencieuse** et une **pastille persistante** signalent une version prête. La pastille apparaît dans les barres des fenêtres et les vues Maison / Quota ; elle ouvre directement les réglages. La dernière vérification et la prochaine recherche sont visibles dans Connexions. Les notifications peuvent être désactivées séparément.

Le moteur d’installation est vérifié : PowerShell 7 est utilisé s’il est disponible, sinon Windows PowerShell. Le runtime PowerShell 7 fourni avec Codex peut aussi être utilisé s’il est présent. Si aucun moteur ne fonctionne, l’erreur reste affichée et l’installation est bloquée ; l’archive peut être extraite manuellement. Lumen ne télécharge pas de moteur et ne modifie pas Windows pour contourner ce problème.

L’installation attend la fermeture de Lumen, vérifie de nouveau l’archive et sa structure, conserve `data/`, remplace les fichiers de l’application puis relance Lumen. Une sauvegarde des fichiers remplacés permet un retour en cas d’échec de copie. Les archives contenant des chemins hors destination ou des données de profil sont refusées. L’app doit être extraite dans un dossier accessible en écriture. Le binaire reste non signé ; la vérification SHA-256 ne remplace pas une signature de code.

Fermer une carte ou une fenêtre ne quitte pas nécessairement Lumen. Pour déclencher l’installation à la fermeture, utilise **Quitter Lumen** dans son icône près de l’horloge Windows, ou **Installer & relancer Lumen** dans les réglages.

Les mises à jour ne relancent aucun chat Codex et ne modifient aucun paiement, crédit ou reset.
