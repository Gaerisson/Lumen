# Versions de Lumen

## 8.2.7

- **Réactivité** : lectures des journaux Codex et de SQLite sorties du processus de l’interface, dans un worker avec délai et mémoire bornés. Une panne du lecteur conserve les autres modules et attend avant de réessayer.
- **Gros historiques** : lecture limitée aux 8 derniers Mio par session ; lignes géantes ignorées avec reprise au prochain événement complet. Cache limité à 16 sessions, événements compactés et secrets masqués avant conservation. Un début de tour absent n’invente pas de durée.
- **Diagnostic local** : état de santé périodique, retard maximal de la boucle principale et incidents des processus de rendu. Le relevé précédent est conservé au redémarrage. Les fichiers restent dans `data/`, sans envoi automatique.

- **Projets actifs** : sous-agents et contrôles internes exclus avant la sélection des projets, pour compter les chats de travail réels.
- **Codex distant** : option explicite de partage de toute la section, avec modèle, commandes, progression et durées. Le client conserve ces détails ; secrets reconnaissables masqués, sorties et raisonnement exclus. Actualisation du quota dirigée vers le PC source.

Validation : 183 tests unitaires et 65 contrôles Windows, dont journal synthétique de 100 Mio, lecture réelle SQLite dans un worker Electron, réactivité de l’interface, deux chats avec sous-agents, synchronisation complète serveur/client et affichage des commandes distantes.

## 8.2.6

- **Lancement du helper Windows** : un lanceur masqué crée l’installateur indépendant avec `Start-Process -WindowStyle Hidden`, au lieu du lancement détaché qui pouvait quitter avec un code 0 sans exécuter le script. La confirmation de préparation du véritable installateur reste obligatoire avant toute fermeture de Lumen.
- **Test réel** : l’appel `PortableUpdater.install()` lance le vrai moteur et attend le marqueur de préparation ; l’annulation laisse l’ancien programme intact. Ce test complète les tests du script et du passage au helper.

Validation : 170 tests unitaires. Inclut les automatismes de 8.2.4 et le délai PowerShell de 8.2.5 ; interface validée avec 58 contrôles Windows.

## 8.2.5

- **Démarrage PowerShell lent** : le contrôle du moteur attend jusqu’à 20 secondes au lieu de 5. Un démarrage de 6 à 7 secondes observé sous charge ne fait plus croire qu’aucun moteur n’est disponible. La réponse du moteur reste vérifiée, le délai reste borné et l’app reste ouverte en cas d’échec.

Validation : 169 tests unitaires, contrôle réel du moteur Windows et installation de l’archive complète. Interface et fonctionnement de l’installation automatique identiques à 8.2.4, validée avec 58 contrôles Windows.

## 8.2.4

- **Installation automatique optionnelle** : depuis les releases stables GitHub, préavis de 60 secondes et report d’une heure depuis les panneaux ou Connexions. Attend la fermeture des réglages et la fin des alarmes, réveils, détections et résumé du matin. Désactivée par défaut sur les nouveaux profils.
- **Passage à l’installateur** : Lumen reste ouvert pendant la validation SHA-256, l’extraction et le contrôle d’accès au dossier. Il quitte seulement après confirmation du helper Windows ; un échec de lancement ou de préparation reste réessayable dans l’app.
- **Suivi** : préparation, redémarrage et résultat lisibles. Une installation est confirmée au lancement uniquement si la version exécutée correspond au résultat de l’installateur.
- **Conservation** : profils et contexte de chiffrement restent en place. L’installateur attend le processus Lumen et ne force aucun arrêt.

Validation : 168 tests unitaires et 58 contrôles Windows ; attente d’un vrai processus isolé, annulation avant copie, conservation du profil, refus des chemins hors archive, report, pause et absence de relance en boucle.

## 8.2.3

- **Écrans au démarrage** : le moniteur préféré est mémorisé avec son modèle, ses caractéristiques et sa disposition, en complément de l’identifiant Windows. Les anciennes configurations sont migrées à partir de l’écran ou des coordonnées déjà sauvegardés.
- **Détection tardive** : un écran temporairement absent ne remplace plus le choix enregistré par le premier écran. À son retour, la fenêtre existante retrouve son moniteur et son plein écran, sans recréer les modules.
- **Déplacements** : les changements automatiques de Windows ne réécrivent plus le choix utilisateur. Les déplacements manuels et les sélections dans le studio restent enregistrés. La position relative est adaptée aux changements de disposition et de zone de travail.
- **Plein écran** : le placement attend la fin effective de la sortie du plein écran pour appliquer les coordonnées. Les fenêtres réduites ou masquées conservent leur état.
- **Veille et alertes** : les coordonnées temporaires de veille restent séparées de la position de base ; les destinations d’alerte déjà associées à un écran sont migrées avec lui.

Validation : 159 tests unitaires et 53 contrôles Windows, dont identifiants modifiés, écran absent puis détecté, déplacement automatique, restauration native et changement explicite d’écran. Aucun redémarrage du PC ni changement réel de la configuration des moniteurs n’est nécessaire pour ces tests.

## 8.2.2

- **Presse-papiers Windows** : la copie de la clé de partage et de l’adresse de retour Spotify utilise l’API native Electron. Les boutons ne dépendent plus de la permission Clipboard du navigateur, qui reste refusée aux pages web.
- **Clés** : la copie est effectuée dans le processus principal, sans retourner la clé au rendu. Copier une clé existante ne la renouvelle pas. Les vues widget ne peuvent pas demander la copie d’une clé serveur.
- **Erreurs** : retour compréhensible si le presse-papiers Windows est occupé et bouton désactivé pendant la copie pour éviter les doubles clics.

Validation : 144 tests unitaires et 48 contrôles Windows. Le test force un refus de l’API Clipboard du navigateur, vérifie les deux boutons et simule l’écriture native pour préserver le vrai presse-papiers du PC.

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
