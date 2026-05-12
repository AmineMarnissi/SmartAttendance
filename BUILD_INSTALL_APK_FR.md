# Guide complet — Construire, installer et lancer l’APK SmartAttendance

Ce guide explique comment repartir de zéro pour préparer l’environnement, installer les dépendances, construire l’APK Android, détecter le téléphone avec ADB, installer l’application, la lancer, puis générer un APK de release. (change PROFILE par le nom d'utilisateur de ton PC)

> Projet utilisé dans ce guide : `E:\projects\SmartAttendance`
>
> SDK Android utilisé : `C:\Users\PROFILE\AppData\Local\Android\Sdk`
>
> Java recommandé pour Android/Gradle : `C:\Users\PROFILE\.jdks\ms-17.0.16`
>
> Package Android de l’application : `com.smartattendance`
>
> Activity principale : `com.smartattendance/.MainActivity`

---

## 1. Ouvrir un terminal PowerShell dans le projet

```powershell
cd E:\projects\SmartAttendance
```

Vérifier que l’on est bien dans le bon dossier :

```powershell
pwd
```

---

## 2. Configurer Java et Android SDK

Pour cette application React Native Android, utiliser Java 17. par exemple 

```powershell
$env:JAVA_HOME="C:\Users\PROFILE\.jdks\ms-17.0.16"
$env:ANDROID_HOME="C:\Users\PROFILE\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT="C:\Users\PROFILE\AppData\Local\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
```

Vérifier Java :

```powershell
java -version
```

Vérifier ADB avec le chemin complet :

```powershell
$adb="$env:ANDROID_HOME\platform-tools\adb.exe"
& $adb version
```

Si `$env:ANDROID_HOME` n’est pas défini, utiliser directement :

```powershell
$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb version
```

---

## 3. Installer les dépendances Node.js

Depuis la racine du projet :

```powershell
npm ci
```

Si `npm ci` échoue à cause d’un lockfile incohérent, utiliser temporairement :

```powershell
npm install
```

Mais pour une build reproductible, `npm ci` est préférable.

---

## 4. Vérifier la qualité du code avant build

Lancer TypeScript :

```powershell
npx tsc --noEmit
```

Lancer ESLint :

```powershell
npx eslint .
```

Lancer les tests Jest :

```powershell
npm test -- --runInBand
```

La build APK doit être faite seulement quand ces validations passent.

---

## 5. Générer le bundle JavaScript Android

React Native doit produire le bundle JS utilisé par l’APK.

```powershell
New-Item -ItemType Directory -Force -Path android\app\src\main\assets | Out-Null
New-Item -ItemType Directory -Force -Path android\app\src\main\res | Out-Null

npx react-native bundle `
  --platform android `
  --dev false `
  --entry-file index.js `
  --bundle-output android\app\src\main\assets\index.android.bundle `
  --assets-dest android\app\src\main\res
```

Le fichier attendu est :

```text
android\app\src\main\assets\index.android.bundle
```

---

## 6. Construire l’APK debug

Depuis la racine du projet :

```powershell
cd E:\projects\SmartAttendance\android
.\gradlew.bat -Dorg.gradle.java.home="C:\Users\PROFILE\.jdks\ms-17.0.16" :app:assembleDebug --no-daemon --console=plain
```

Revenir ensuite à la racine :

```powershell
cd E:\projects\SmartAttendance
```

APK debug généré :

```text
E:\projects\SmartAttendance\android\app\build\outputs\apk\debug\app-debug.apk
```

Vérifier que le fichier existe :

```powershell
Get-Item android\app\build\outputs\apk\debug\app-debug.apk | Select-Object FullName,Length,LastWriteTime
```

---

## 7. Préparer le téléphone Android

Sur le téléphone :

1. Activer les Options développeur.
2. Activer Débogage USB.
3. Brancher le téléphone avec un câble USB data.
4. Mettre le mode USB sur Transfert de fichiers / Android Auto.
5. Accepter la fenêtre RSA : Autoriser le débogage USB.

---

## 8. Détecter le téléphone avec ADB

Depuis PowerShell :

```powershell
cd E:\projects\SmartAttendance

$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb start-server
& $adb devices -l
```

Résultat attendu :

```text
List of devices attached
a2130f3f               device product:OnePlus7Pro model:GM1913 device:OnePlus7Pro transport_id:...
```

Si le téléphone apparaît en `unauthorized` :

```powershell
& $adb kill-server
& $adb start-server
& $adb devices -l
```

Puis accepter la popup RSA sur le téléphone.

Si aucun téléphone n’apparaît :

- vérifier que le câble USB supporte les données ;
- déverrouiller le téléphone ;
- changer le mode USB en Transfert de fichiers ;
- désactiver/réactiver Débogage USB ;
- essayer un autre port USB.

---

## 9. Installer l’APK debug sur le téléphone

Utiliser l’ID détecté par ADB. Dans notre cas : `a2130f3f`.

```powershell
cd E:\projects\SmartAttendance

$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s a2130f3f install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Résultat attendu :

```text
Performing Streamed Install
Success
```

Si l’installation échoue à cause d’une signature différente :

```powershell
& $adb -s a2130f3f uninstall com.smartattendance
& $adb -s a2130f3f install android\app\build\outputs\apk\debug\app-debug.apk
```

Attention : `uninstall` supprime les données locales de l’application.

---

## 10. Lancer l’application sur le téléphone

```powershell
$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s a2130f3f shell am start -n com.smartattendance/.MainActivity
```

Résultat attendu :

```text
Starting: Intent { cmp=com.smartattendance/.MainActivity }
```

---

## 11. Lire les logs pendant le test

Pour suivre les logs utiles pendant l’enrôlement ou le scan live :

```powershell
$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s a2130f3f logcat -c
& $adb -s a2130f3f logcat -v time | Select-String -Pattern "SmartAttendance|FaceRecognition|FaceCapture|EmbeddingStorage|FaceMatcher|useFaceRecognition|ReactNativeJS|Unknown|threshold|embedding|classId|best"
```

À vérifier dans l’écran Live Attendance :

```text
faces détectées
nombre d'embeddings enrôlés
best score
seuil de matching
student id candidat
longueur du vecteur, par exemple 192
raison du rejet, par exemple below-threshold ou no-comparable-embeddings
```

---

## 12. Workflow complet debug en une seule séquence

```powershell
cd E:\projects\SmartAttendance

$env:JAVA_HOME="C:\Users\PROFILE\.jdks\ms-17.0.16"
$env:ANDROID_HOME="C:\Users\PROFILE\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT="C:\Users\PROFILE\AppData\Local\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
$adb="$env:ANDROID_HOME\platform-tools\adb.exe"

npm ci
npx tsc --noEmit
npx eslint .
npm test -- --runInBand

New-Item -ItemType Directory -Force -Path android\app\src\main\assets | Out-Null
New-Item -ItemType Directory -Force -Path android\app\src\main\res | Out-Null

npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res

cd android
.\gradlew.bat -Dorg.gradle.java.home="C:\Users\PROFILE\.jdks\ms-17.0.16" :app:assembleDebug --no-daemon --console=plain
cd ..

& $adb devices -l
& $adb -s a2130f3f install -r android\app\build\outputs\apk\debug\app-debug.apk
& $adb -s a2130f3f shell am start -n com.smartattendance/.MainActivity
```

---

## 13. Construire un APK release

### 13.1 Générer ou vérifier la clé de signature

Si aucune clé release n’existe encore, générer un keystore :

```powershell
cd E:\projects\SmartAttendance\android\app

keytool -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore smartattendance-release-key.keystore `
  -alias smartattendance `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Conserver le mot de passe dans un endroit sécurisé. Ne jamais publier le keystore.

### 13.2 Configurer la signature release

Dans `android\gradle.properties`, ajouter ou vérifier :

```properties
SMARTATTENDANCE_UPLOAD_STORE_FILE=smartattendance-release-key.keystore
SMARTATTENDANCE_UPLOAD_KEY_ALIAS=smartattendance
SMARTATTENDANCE_UPLOAD_STORE_PASSWORD=VOTRE_MOT_DE_PASSE
SMARTATTENDANCE_UPLOAD_KEY_PASSWORD=VOTRE_MOT_DE_PASSE
```

Dans `android\app\build.gradle`, vérifier que `signingConfigs.release` et `buildTypes.release` utilisent ces variables.

Exemple :

```gradle
signingConfigs {
    release {
        if (project.hasProperty('SMARTATTENDANCE_UPLOAD_STORE_FILE')) {
            storeFile file(SMARTATTENDANCE_UPLOAD_STORE_FILE)
            storePassword SMARTATTENDANCE_UPLOAD_STORE_PASSWORD
            keyAlias SMARTATTENDANCE_UPLOAD_KEY_ALIAS
            keyPassword SMARTATTENDANCE_UPLOAD_KEY_PASSWORD
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        shrinkResources false
    }
}
```

### 13.3 Générer le bundle JS release

```powershell
cd E:\projects\SmartAttendance

New-Item -ItemType Directory -Force -Path android\app\src\main\assets | Out-Null
New-Item -ItemType Directory -Force -Path android\app\src\main\res | Out-Null

npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res
```

### 13.4 Construire l’APK release

```powershell
cd E:\projects\SmartAttendance\android

.\gradlew.bat -Dorg.gradle.java.home="C:\Users\PROFILE\.jdks\ms-17.0.16" :app:assembleRelease --no-daemon --console=plain
```

APK release attendu :

```text
E:\projects\SmartAttendance\android\app\build\outputs\apk\release\app-release.apk
```

Vérification :

```powershell
Get-Item E:\projects\SmartAttendance\android\app\build\outputs\apk\release\app-release.apk | Select-Object FullName,Length,LastWriteTime
```

### 13.5 Installer l’APK release sur le téléphone

```powershell
cd E:\projects\SmartAttendance

$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s a2130f3f install -r android\app\build\outputs\apk\release\app-release.apk
& $adb -s a2130f3f shell am start -n com.smartattendance/.MainActivity
```

Si la signature release est différente de la signature debug, désinstaller d’abord la version debug :

```powershell
& $adb -s a2130f3f uninstall com.smartattendance
& $adb -s a2130f3f install android\app\build\outputs\apk\release\app-release.apk
& $adb -s a2130f3f shell am start -n com.smartattendance/.MainActivity
```

---

## 14. Générer un Android App Bundle release optionnel

Pour publication Play Store, générer plutôt un `.aab` :

```powershell
cd E:\projects\SmartAttendance\android
.\gradlew.bat -Dorg.gradle.java.home="C:\Users\PROFILE\.jdks\ms-17.0.16" :app:bundleRelease --no-daemon --console=plain
```

Fichier attendu :

```text
E:\projects\SmartAttendance\android\app\build\outputs\bundle\release\app-release.aab
```

---

## 15. Problèmes fréquents

### ADB ne voit pas le téléphone

```powershell
$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb kill-server
& $adb start-server
& $adb devices -l
```

Puis vérifier le téléphone : Débogage USB, popup RSA, mode Transfert de fichiers.

### `JAVA_HOME` incorrect

Forcer Java 17 :

```powershell
$env:JAVA_HOME="C:\Users\PROFILE\.jdks\ms-17.0.16"
java -version
```

### Gradle utilise le mauvais Java

Utiliser explicitement :

```powershell
.\gradlew.bat -Dorg.gradle.java.home="C:\Users\PROFILE\.jdks\ms-17.0.16" :app:assembleDebug --no-daemon --console=plain
```

### APK installé mais application ne démarre pas

Lancer directement l’Activity :

```powershell
$adb="C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s a2130f3f shell am start -n com.smartattendance/.MainActivity
```

Puis lire les logs :

```powershell
& $adb -s a2130f3f logcat -d -v time | Select-String -Pattern "AndroidRuntime|FATAL|ReactNativeJS|SmartAttendance|FaceRecognition"
```

---

## 16. Résumé rapide des chemins importants

```text
Projet:
E:\projects\SmartAttendance

Java 17:
C:\Users\PROFILE\.jdks\ms-17.0.16

Android SDK:
C:\Users\PROFILE\AppData\Local\Android\Sdk

ADB:
C:\Users\PROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe

APK debug:
E:\projects\SmartAttendance\android\app\build\outputs\apk\debug\app-debug.apk

APK release:
E:\projects\SmartAttendance\android\app\build\outputs\apk\release\app-release.apk

Package:
com.smartattendance

Activity:
com.smartattendance/.MainActivity

Device actuel:
a2130f3f
```
