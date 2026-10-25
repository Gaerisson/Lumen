# Versions de Lumen

## 8.2.1

- **Recherche automatique** : démarrage après quelques secondes, puis toutes les 10 minutes au lieu de six heures. Réactivation prise en compte immédiatement, vérification après une veille ou un retour réseau si le dernier essai date de plus de deux minutes. Les erreurs réseau sont réessayées avec une attente progressive ; les limites GitHub restent respectées.
- **Proposition visible** : notification Windows silencieuse, pastille dans les réglages, les barres de fenêtre et les écrans principaux Maison / Quota. Un clic ouvre directement le suivi. Aucun écran supplémentaire ni installation forcée.
- **Suivi clair** : dernière vérification réussie, prochaine recherche, progression en direct et option de notification. Une recherche manuelle télécharge aussi la version si le téléchargement automatique est activé.
- **Installateur** : moteur PowerShell vérifié avant de proposer une installation. PowerShell 7 peut être utilisé quand il est déjà installé, y compris le runtime fourni avec Codex s’il est présent. Un moteur absent ou défaillant est signalé ; aucun moteur n’est téléchargé automatiquement et aucun réglage système n’est modifié.
- **Guide** : l’ancien tutoriel ne s’ouvre plus automatiquement après avoir terminé le guide actuel.

Validation : 144 tests unitaires, dont planification, reprise réseau, quotas GitHub et installation réelle avec conservation du profil ; 44 contrôles du parcours Windows, dont propositions et progression sans fenêtre supplémentaire.

## 8.2.0

- **PC distants** : découverte LAN à la demande, visibilité désactivable, test authentifié et erreurs compréhensibles. Un nom de PC ou une IP suffit pour l’adresse. Copier une clé ne renouvelle plus les clés existantes ; les changements de clé et les requêtes en cours ne réutilisent plus une ancienne erreur en cache.
- **Connexions** : étapes séparées pour partager ce PC et afficher un autre PC. Sauvegarder les PC conserve les fenêtres et la connexion Home Assistant. La découverte ne diffuse aucun quota, projet ou secret.
- **Studio** : l’aperçu représente clairement le contenu de la fenêtre choisie, avec ses proportions. Un rafraîchissement en cours ne peut plus écraser une modification commencée entre-temps.
- **Personnalisation par carte** : titre et densité ; choix d’un ordinateur, des entités NAS et du nombre de titres d’actualité.
- **Proxmox** : filtres nœuds, VM, CT, invités ou sauvegardes, métriques au choix et sélection d’entités. Reconnaissance des appareils via les registres Home Assistant, avec compatibilité des anciennes entités françaises. Les valeurs indisponibles restent distinctes de zéro ; aucune commande Proxmox n’est envoyée.

Validation : 133 tests unitaires, 38 contrôles du parcours Windows avec deux PC simulés et tests de l’accueil sans connexion vidéo au repos. Archive publique et conservation des profils vérifiées séparément. La découverte nécessite Lumen 8.2 sur les deux PC ; un pare-feu ou l’isolation réseau peuvent imposer la saisie manuelle de l’adresse.

## 8.1.0

- **Mes capteurs** : jusqu’à huit entités Home Assistant par module, choisies dans une liste avec recherche. Valeurs, unités, disponibilité et courbes locales ; historique limité à 120 points par capteur, à raison d’un point toutes les 15 secondes. Seules les entités sélectionnées sont exposées au widget. Aucune commande d’appareil n’est envoyée.
- **État des services** : Home Assistant, quota Codex, météo, UniFi, Spotify et ordinateurs. Les modules désactivés sont distingués des connexions indisponibles. Ce panneau réutilise les données existantes sans ajouter de requête réseau.
- **Studio** : annuler/rétablir, raccourcis clavier, répartition automatique sans chevauchement et déplacement d’un panneau vers un autre écran. La sélection d’une autre caméra conserve le mode de cadrage.
- **Sauvegarde** : modifier une disposition ne réactive plus les modules désactivés. Les fenêtres inchangées et la connexion Home Assistant sont conservées, ce qui évite des rechargements et reconnexions inutiles.
- **Home Assistant** : la suppression d’une entité par WebSocket retire immédiatement son ancien état.
- **Mises à jour** : regroupement des téléchargements simultanés, récupération d’une archive manquante, prise en compte des échecs d’installation au redémarrage et erreurs d’écriture affichées sans interrompre brutalement l’app. Une version ayant échoué n’est pas réinstallée automatiquement en boucle.
- **Guide** : les commandes de connexion sont désactivées pendant la vérification pour éviter les doubles connexions ; les adresses saisies sont conservées lors des retours entre étapes.

Validation : tests unitaires, parcours Windows avec services simulés, réception et suppression d’un capteur en temps réel, rendu des nouveaux modules et tests de l’accueil sans flux vidéo au repos. Les alarmes, sons, luminosités et lectures cloud réels ne servent pas de tests.

## 8.0.0

Guide de première ouverture, studio visuel par écran, listes Home Assistant, destinations d’alerte indépendantes, caméras Frigate en direct, quota sans décompte à 100 % restant et mises à jour portables vérifiées par SHA-256.
