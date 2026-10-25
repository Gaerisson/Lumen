# Versions de Lumen

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
