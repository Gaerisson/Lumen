# Première ouverture et studio

Sur une installation neuve, Lumen ouvre uniquement son guide de bienvenue. Les services, sons, alertes et automatismes sont facultatifs. Une installation existante conserve ses panneaux et associations.

1. **Connexions** — renseigne l’adresse de Home Assistant et un jeton longue durée créé dans ton profil HA. « Connecter » vérifie la lecture des entités avant d’enregistrer le jeton chiffré. UniFi, NAS, Proxmox et ResMed passent par leurs intégrations HA.
2. **Capteurs** — recherche par nom, identifiant, unité ou intégration. Les suggestions ne limitent pas la liste : toutes les entités remontées sont sélectionnables. Les champs à plusieurs entités utilisent des étiquettes faciles à retirer.
3. **Caméras** — renseigne Frigate et son serveur go2rtc accessible depuis ce PC. Les noms des caméras sont détectés ; les URL RTSP et mots de passe restent dans Frigate. Sélectionne les caméras à ouvrir sur une détection de personne.
4. **Écrans** — choisis un premier panneau et les destinations indépendantes de l’intrusion, du réveil, du résumé et des détections. Recherche une ville pour la météo. Le guide peut être relancé en conservant la disposition existante.
5. **Studio** — sélectionne un écran, ajoute un panneau puis clique ou glisse un module depuis la palette. Déplace les cartes et tire leur coin pour les redimensionner. « Enregistrer & afficher » applique la disposition. Le module Caméra propose les caméras Frigate en direct, muettes par défaut ; les vidéos masquées sont suspendues.

La navigation principale propose **Mon studio**, **Connexions**, **Apparence**. Les réglages détaillés restent dans **Réglages avancés**, avec une recherche. `Ctrl+Alt+L` ouvre les réglages ; `Ctrl+Alt+Espace` masque les panneaux.

## Mises à jour automatiques

La version Windows portable vérifie les versions stables de `Gaerisson/Lumen` sur GitHub. Elle télécharge l’archive Windows et contrôle son SHA-256 publié par GitHub avant de la préparer. Les réglages dans **Connexions** permettent de désactiver le téléchargement ou l’installation à la fermeture, de vérifier manuellement et d’installer une version prête immédiatement.

L’installation attend la fermeture de Lumen, vérifie de nouveau l’archive et sa structure, conserve `data/`, remplace les fichiers de l’application puis relance Lumen. Une sauvegarde des fichiers remplacés permet un retour en cas d’échec de copie. Les archives contenant des chemins hors destination ou des données de profil sont refusées. L’app doit être extraite dans un dossier accessible en écriture. Le binaire reste non signé ; la vérification SHA-256 ne remplace pas une signature de code.

Les mises à jour ne relancent aucun chat Codex et ne modifient aucun paiement, crédit ou reset.
