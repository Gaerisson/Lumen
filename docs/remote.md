# Connecter deux PC

Chaque PC garde son propre profil Windows. Ne copie pas `data/` ni les fichiers de clés entre machines.

1. Sur le **PC qui possède les données**, ouvre **Connexions → PC distants**. Active le partage, l’accès au réseau local et la visibilité dans la recherche. Enregistre, puis **Copier la clé de partage**.
2. Sur le **PC qui affiche les données**, clique sur **Rechercher sur le réseau**, ajoute le PC trouvé et colle sa clé. **Tester la connexion** vérifie immédiatement le quota et les capteurs disponibles.
3. Choisis ce PC dans **Afficher la section Codex de**, puis enregistre. Le module Ordinateurs permet de choisir un PC ou de tous les afficher dans le studio.

## Synchroniser toute la section Codex

Avec **Lumen 8.2.7 ou plus récent sur les deux PC**, active **Synchroniser toute la section Codex** sur le PC qui possède Codex, puis enregistre. Le client reçoit les projets, leur statut, le modèle, les durées, les dernières commandes et les messages de progression. Le quota, les crédits et le temps de recharge utilisent aussi le PC source. Le bouton d’actualisation du client relit cette source sans lancer de commande à distance.

Cette option est désactivée par défaut et peut être retirée à tout moment. Les détails sont accessibles uniquement aux PC ayant la clé de partage. Les secrets reconnaissables sont masqués ; les sorties des outils et le raisonnement interne ne sont jamais inclus. Si les commandes sont absentes, le test de connexion indique si le partage détaillé est actif. Les anciens clients conservent le quota et les titres, mais doivent être mis à jour pour afficher la section complète.

Les sous-agents et contrôles internes sont exclus des projets affichés : un projet qui utilise plusieurs sous-agents ne fait pas monter artificiellement le compteur de chats actifs.

La recherche nécessite Lumen **8.2 ou plus récent sur les deux PC**, dans le même réseau. Elle utilise UDP **32146** et annonce seulement une identité Lumen, le nom de la machine, sa version et son port HTTP. Les données, les projets et les clés ne font jamais partie de cette annonce. Désactiver la visibilité coupe le répondeur de découverte.

Si la recherche est bloquée, **Saisir une adresse** reste disponible. Un nom comme `pc-atelier.local` ou une adresse IP suffit ; Lumen ajoute le port **32145**. Les URL HTTP(S) et ports explicites restent acceptés. `0.0.0.0` est une adresse d’écoute, pas l’adresse à saisir sur un autre PC.

## Comprendre un échec

| Message | À vérifier sur le PC qui partage |
| --- | --- |
| Clé refusée | Recopie sa clé actuelle. Copier une clé existante ne la renouvelle plus. |
| Connexion refusée | Lumen ouvert, partage réseau activé, même port dans les deux apps. |
| Nom introuvable | Utilise la recherche ou l’adresse IP ; le nom du PC doit être résolu par ton réseau. |
| Délai dépassé | PC allumé, même réseau, isolation Wi-Fi/VLAN et pare-feu. |
| Certificat HTTPS non valide | Corrige le certificat du serveur ; Lumen ne contourne pas la validation. |

Lumen n’ouvre pas automatiquement le pare-feu. Si Windows demande l’accès réseau, limite-le au réseau privé souhaité. Le partage reste authentifié et en lecture seule. HTTP ne chiffre pas les données : utilise HTTPS ou un VPN privé hors réseau de confiance.

Le bouton **Renouveler la clé** est séparé : il invalide les anciennes clés des clients. Changer seulement la source ou une connexion ne recrée pas les fenêtres et ne redémarre pas Home Assistant.

Le capteur Node sans interface (`npm run agent -- --token-file <fichier-privé> --host <adresse>`) reste joignable manuellement ; la découverte automatique concerne les apps Windows Lumen.
