# Développer Lumen

Prérequis : Windows 10/11, Node.js 24 et npm. Les versions des dépendances sont
verrouillées dans `package-lock.json`.

```powershell
npm ci
npm run check
npm test
npm start
```

Pour un profil de développement indépendant, définis `LUMEN_DATA_DIR` vers un
dossier privé avant `npm start`. Ne copie pas les clés d’un autre profil Windows.

## Où intervenir

| Dossier | Contenu |
| --- | --- |
| `src/main/` | Fenêtres Electron, IPC, collecteurs, Home Assistant, Spotify et partage distant |
| `src/renderer/` | Pages HTML, interface dans `js/`, styles dans `css/` |
| `src/shared/` | Géométrie, calculs et règles utilisables dans plusieurs contextes |
| `assets/icons/` | Icônes Windows et PNG |
| `tests/unit/` | Tests Node avec services simulés |
| `tests/smoke/` | Scénarios de rendu et de fenêtres sur Windows |
| `scripts/` | Compilation portable et vérification des chemins |

Le point d’entrée est `src/main/main.js` ; le preload isolé est
`src/main/preload.js`. Le processus principal charge les pages dans
`src/renderer/`. Les chemins des scripts et styles sont relatifs à ces pages.

Les connecteurs sont déclarés dans `src/main/modules.js`. Leur configuration se
trouve dans `src/renderer/js/modules-settings.js`. Les mises à jour visuelles
stables passent par `src/renderer/js/live-dom.js`.

## Vérification native

```powershell
npm run smoke
npm run smoke:home
npm run smoke:regression
npm run smoke:performance
npm run smoke:setup
```

Ces scénarios utilisent leurs propres profils et services simulés. Les résultats,
captures et profils sont écrits dans `test-results/`, ignoré par Git. Ils peuvent
afficher temporairement des fenêtres de démonstration. Ils ne pilotent aucune
alarme réelle, luminosité matérielle, lecture musicale ou conversation Codex.

## Distribution Windows

```powershell
npm run build
npm run build -- --update
```

La première commande produit `dist/Lumen/`. La seconde met à jour un dossier
déjà construit, après fermeture de son exécutable. `LUMEN_OUTPUT` permet de choisir
un autre dossier de sortie. La version et le point d’entrée proviennent du même
`package.json` que le développement.

Le premier lancement ou la première compilation peut télécharger le binaire
Electron verrouillé par le projet ([installation Electron](https://www.electronjs.org/docs/latest/tutorial/installation)).

Le paquet conserve les dossiers `src/`, `assets/` et `tests/smoke/`, plus la
dépendance d’exécution `ws`. Les profils, tests unitaires, résultats et fichiers
locaux ne sont pas embarqués. L’agent distant se lance avec
`node src/agent.cjs --token-file <fichier-privé>` depuis les sources, ou
`node resources/app/src/agent.cjs --token-file <fichier-privé>` depuis le portable.

Ne publie jamais `data/`, `test-results/`, des clés, des journaux réels ou des
captures personnelles. Voir [la politique de sécurité](../SECURITY.md).
