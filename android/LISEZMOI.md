# Archipel sur Android (prototype)

Coque Android du jeu : une seule activité (`app/src/main/java/fr/archipel/jeu/MainActivity.java`) qui
affiche le jeu web construit (`dist/`) dans une WebView plein écran, en paysage. Aucune dépendance : ni
npm, ni bibliothèque Android, rien que le SDK.

## Comment l'APK est fabriqué

Par GitHub Actions (`.github/workflows/apk.yml`), sans rien installer sur l'ordinateur :

1. `npm ci` puis `npm run build` (le jeu seul : le catalogue et le tableau de bord sont retirés) ;
2. `dist/` est copié dans `android/app/src/main/assets/www/` (non versionné) ;
3. Gradle 8.10.2, plugin Android 8.7.3, JDK 17 : `gradle -p android assembleDebug` ;
4. l'APK (`archipel-<version>.apk`) est joint à l'exécution (artefact) ; pour une étiquette `v*`, il est
   publié en pré-version dans Releases avec `android/NOTES-VERSION.md`.

Lancer une construction : onglet Actions → « APK Android » → « Run workflow ». Publier une version :

```bash
git tag v0.1.0-prototype
git push origin v0.1.0-prototype
```

## Comment le jeu tourne dans l'APK

- Les fichiers sont servis depuis l'APK sous `https://appassets.androidplatform.net/` (interception des
  requêtes de la WebView, `servir`) : modules JavaScript, Worker de génération, polices et sons se chargent
  comme sur le serveur de développement, les chemins absolus du jeu (`/audio/…`) compris.
- La sauvegarde (IndexedDB) reste attachée à cette adresse ; une désinstallation l'efface.
- Retour = Échap ; passage en arrière-plan = `pagehide` (le jeu enregistre la partie).
- Couleurs : thème clair, `forceDarkAllowed=false`, `colorMode` sRGB par défaut, assombrissement de la
  WebView coupé (`setAlgorithmicDarkeningAllowed(false)` dès Android 13, `FORCE_DARK_OFF` sur 10 à 12), page
  en `color-scheme: only light` (`index.html`) : le mode sombre du téléphone ne touche plus au jeu.
- Version de débogage : la page s'inspecte depuis `chrome://inspect` sur l'ordinateur (câble USB, débogage
  USB activé sur le téléphone).

## Limites du prototype

- APK signé avec une clé de débogage créée à chaque construction : une nouvelle version peut exiger de
  désinstaller l'ancienne. Pour des mises à jour sans perte : une clé de signature gardée dans les secrets
  du dépôt (à faire).
- Commandes tactiles réduites à celles du jeu (toucher pour aller, glisser pour la caméra).
- Construit seulement sur GitHub (ni JDK ni SDK Android sur l'ordinateur de développement) : première version
  `v0.1.0-prototype` publiée le 22/11/2026 (https://github.com/Hugordf77/archipel/releases), pas encore
  essayée sur un téléphone.
- Avertissements du workflow à traiter : actions en Node 20 (dépréciées), `setup-java@v4` à passer en v5.
