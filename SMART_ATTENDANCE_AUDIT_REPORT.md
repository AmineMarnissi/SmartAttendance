# RegistreIntelligent Deep Audit Report

Generated: 2026-05-10
Repository: `E:\projects\SmartAttendance`
Branch at audit time: `main`
Initial Git status: clean

## Executive summary

SmartAttendance (now RegistreIntelligent) is a React Native 0.78 mobile app for school attendance with local PIN authentication, local SQLite-style persistence, camera-based face capture, TensorFlow Lite face embeddings, attendance review, reporting/export, and local absence notifications.

The app has a strong prototype foundation: the data model is clear, database queries mostly use parameter binding, the attendance workflow is understandable, the camera/face-recognition flow is separated into services/hooks, and tests exist for core matching and attendance logic.

However, it is not production-ready. The largest risks are hardcoded seed credentials, unencrypted biometric templates and student data stored locally, a release build configured to use the debug keystore, disabled release shrinking/obfuscation, incomplete user-management and settings screens, weak session/auth persistence controls, and missing build prerequisites in the local environment. APK export was attempted but blocked because Java/JDK is not configured on the machine visible to Cobra.

## Build and validation evidence

### Repository access

Cobra was able to list and read the validated repository at `E:\projects\SmartAttendance`.

### Git state

Initial Git status was clean:

```text
## main...origin/main
```

### Test attempt

Command attempted through Cobra:

```powershell
npm test -- --runInBand
```

Result:

```text
> SmartAttendance@0.0.1 test
> jest --runInBand

'jest' is not recognized as an internal or external command,
operable program or batch file.
```

Cause found:

```text
Test-Path node_modules              => False
Test-Path node_modules\.bin\jest.cmd => False
```

Conclusion: tests did not run because dependencies are not installed locally. This is an environment/setup blocker, not a test assertion failure.

### Android APK build attempt

Command attempted through Cobra:

```powershell
Set-Location android; .\gradlew.bat :app:assembleDebug --stacktrace
```

Result:

```text
ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation.
```

Common JDK install locations checked from Cobra did not reveal a JDK:

- `C:\Program Files\Java`
- `C:\Program Files\Android\Android Studio\jbr`
- `C:\Program Files\Eclipse Adoptium`
- `C:\Program Files\Microsoft\jdk-17*`
- `C:\Program Files\Microsoft\jdk-21*`

Conclusion: APK generation is blocked by missing Java/JDK configuration. No APK was produced during this audit.

## Application architecture overview

### Main stack

- React Native `0.74.0`
- React `18.2.0`
- TypeScript
- Zustand for in-memory auth state
- React Navigation stack + tabs
- `@op-engineering/op-sqlite` for local database
- `react-native-vision-camera` for camera access
- `vision-camera-face-detector` for face detection
- `react-native-fast-tflite` for TensorFlow Lite inference
- `react-native-fs` and React Native `Share` for CSV export
- Notifee for local notifications

### Main flows

1. App starts.
2. Database is initialized.
3. Seed data is inserted if no users exist.
4. User selects a seeded user and enters PIN.
5. Admin can enroll students and capture face embeddings.
6. Teacher can scan a class, review detected attendance, and save records.
7. Admin can export class reports as CSV.
8. Local notification alerts are sent for repeated absences.

## Strengths

### 1. Clear local-first architecture

The app does not depend on a remote backend for its core attendance workflow. This is good for schools with poor connectivity, demonstrations, and fast classroom usage.

### 2. Good data model foundation

The database schema includes separate tables for users, schools, classes, students, enrollments, face embeddings, attendance sessions, and attendance records. It also includes useful uniqueness constraints and indexes, including:

- unique student code
- unique attendance record per session/student
- unique enrollment per class/student
- indexes for attendance session, student, class/date, and embedding lookup

### 3. Parameterized SQL in most repository methods

Most database operations use `?` placeholders for values, which reduces SQL injection risk for normal inputs.

### 4. Face-recognition responsibilities are separated

The implementation separates face matching, embedding storage, embedding generation, face capture, and scan UI. That is much easier to maintain than putting all model logic inside screens.

### 5. On-device AI approach

The app bundles TensorFlow Lite models and runs face recognition locally. Benefits include lower latency, offline support, and reduced need to transmit biometric images to a server.

### 6. Attendance review step before saving

Detected attendance is not blindly saved. The teacher reviews and can manually toggle present/absent before confirming. This is important because face recognition is probabilistic.

### 7. Basic automated test coverage exists

Tests exist for cosine similarity, face matching, and attendance processing. The test suite is not exhaustive, but the project has a starting point for regression protection.

### 8. Android manifest is relatively minimal

Main Android permissions are limited to `INTERNET` and `CAMERA`. The app does not request broad storage or location permissions in the current manifest.

### 9. Android backup is disabled

`android:allowBackup="false"` is set, which helps reduce accidental extraction of local database data through Android backup mechanisms.

### 10. Debug cleartext traffic is scoped to debug manifest

`android:usesCleartextTraffic="true"` appears only in `android/app/src/debug/AndroidManifest.xml`, not the main production manifest.

## Weaknesses and risks

## Critical issues

### C1. Hardcoded seed users and predictable PINs

`seedData.ts` creates an admin user with PIN `1234` and a teacher user with PIN `5678` when the database has no users.

Impact:

- Anyone who installs the app fresh can log in with known credentials.
- This creates an admin bypass if the app is distributed with seeding enabled.
- The login screen lists all users, so the attacker does not even need to know usernames.

Recommendation:

- Remove demo seed credentials from production builds.
- Gate seed data behind an explicit development flag.
- Force first-run admin setup with PIN complexity checks.
- Do not show all users by default on the login screen in production.

### C2. Biometric templates are stored locally without encryption

Face embeddings are stored as SQLite BLOBs in `face_embeddings`. There is no evidence of database encryption, per-record encryption, Android Keystore wrapping, or secure deletion.

Impact:

- Face embeddings are biometric identifiers and should be treated as sensitive data.
- If the device is compromised, rooted, physically accessed, or the database is extracted, templates may be exposed.
- Even if embeddings are not raw images, they are biometric templates and may be regulated data.

Recommendation:

- Encrypt biometric templates before writing them to SQLite.
- Use Android Keystore-backed keys.
- Consider SQLCipher or application-level AES-GCM encryption.
- Store the minimum number of embeddings needed.
- Add deletion/export/retention controls for student biometric data.

### C3. Release build uses debug signing key

`android/app/build.gradle` configures release signing with `signingConfigs.debug`.

Impact:

- Release APKs are signed with the public/default debug keystore.
- This is unacceptable for production distribution.
- Anyone with the same debug key material could produce compatible updates in some scenarios.

Recommendation:

- Create a real release keystore.
- Use environment variables or `gradle.properties` outside source control for passwords.
- Never ship production builds signed with `android/app/debug.keystore`.

### C4. APK could not be exported due to missing Java/JDK setup

Gradle cannot run because `JAVA_HOME` is missing and `java` is not on PATH.

Impact:

- No APK can be generated from this environment until Java is configured.

Recommendation:

- Install JDK 17, or configure Android Studio bundled JBR if installed.
- Set `JAVA_HOME` and update PATH.
- Then run `npm ci` and `cd android && .\gradlew.bat :app:assembleDebug`.

## High issues

### H1. Dependencies are not installed locally

`node_modules` is absent, so Jest and React Native tooling are unavailable.

Impact:

- Tests cannot run.
- TypeScript/lint checks cannot run.
- Android Gradle build may also fail later because React Native Gradle files depend on `node_modules`.

Recommendation:

- Run `npm ci` from the repo root.
- Re-run `npm test -- --runInBand`.
- Re-run Android assemble.

### H2. PIN authentication lacks lockout and rate limiting

`AuthService.login` compares the PIN hash but does not track failed attempts, lock accounts, add backoff, or audit attempts.

Impact:

- Local brute force is possible, especially with 4-digit PINs.
- If a device is accessible, attackers can try repeated PINs.

Recommendation:

- Require 6+ digit PINs or passphrases.
- Add exponential backoff and lockout.
- Record failed attempts.
- Consider biometric/device credential unlock for app access.

### H3. Auth state is only in memory

The Zustand auth store holds `isAuthenticated` and `user` in memory. There is no secure session storage or explicit timeout.

Impact:

- The app may reset auth on process restart, which hurts UX.
- There is no inactivity timeout or app-background lock, which hurts security.

Recommendation:

- Store only minimal session state securely.
- Lock the app after inactivity or when backgrounded.
- Require PIN re-entry for sensitive actions such as enrollment/export.

### H4. Release shrinking and obfuscation are disabled

`enableProguardInReleaseBuilds = false`.

Impact:

- Larger APKs.
- Easier reverse engineering.
- Less protection around model and business logic.

Recommendation:

- Enable R8/ProGuard for release builds.
- Add keep rules for React Native, TFLite, camera, and Nitro modules as required.

### H5. Placeholder screens and incomplete management workflows

The following screens or actions are placeholders/incomplete:

- `PinSetupScreen`
- `ClassListScreen`
- `SettingsScreen`
- Admin Dashboard: Manage Classes, Manage Teachers, School Settings actions
- Scan screen camera flip button has empty handler
- Attendance history item click does nothing
- `AttendanceService.finalizeSession` does not update `end_time` or notes

Impact:

- The app is not feature-complete.
- Admin cannot fully manage school data.
- Sessions are not truly finalized.

Recommendation:

- Complete CRUD for classes, teachers, settings, and PIN setup.
- Implement session close/finalization.
- Add detail views for attendance history.

### H6. CSV export is vulnerable to malformed CSV and formula injection

`CSVExportService` joins object values with commas without escaping quotes, commas, newlines, or spreadsheet formulas.

Impact:

- Names/fields containing commas/newlines break CSV structure.
- Values starting with `=`, `+`, `-`, or `@` may become spreadsheet formulas when opened in Excel/Sheets.

Recommendation:

- Escape CSV values according to RFC-style CSV rules.
- Prefix potentially dangerous spreadsheet formula values.
- Include student names, class names, and IDs consistently.

### H7. Student and biometric data governance is missing

The app captures and stores students and face embeddings but does not include consent, retention, deletion, audit, or export controls.

Impact:

- Risk for real school deployments, especially with minors.
- Hard to meet privacy requirements.

Recommendation:

- Add consent tracking.
- Add student deletion that also deletes embeddings/enrollments/attendance where required.
- Add data-retention configuration.
- Add admin audit logs.

## Medium issues

### M1. Dynamic update methods allow arbitrary column names

`studentRepository.update` and `classRepository.update` build SQL field names from object keys.

Impact:

- Values are parameterized, but column names are not whitelisted.
- Current call sites may be safe, but the pattern is risky as the codebase grows.

Recommendation:

- Whitelist allowed column names before building dynamic SQL.

### M2. `cosineSimilarity` does not handle zero vectors or length mismatch

The utility version divides by the product of norms without checking zero denominators or matching lengths. The worklet version is safer, but `FaceMatcher` uses the utility version.

Impact:

- Zero vectors can produce `NaN`.
- Length mismatch silently ignores extra elements or returns misleading values.

Recommendation:

- Add checks for equal nonzero lengths and zero norms.
- Return 0 for invalid inputs.

### M3. Face matching threshold is hardcoded and tests mention the wrong value

`MATCH_THRESHOLD` is `0.85`, but test descriptions mention `0.75`.

Impact:

- Confusion when tuning the model.
- Tests may pass while documentation/comments are stale.

Recommendation:

- Update tests/comments.
- Make threshold configurable per model/version.
- Validate threshold with real false-positive/false-negative testing.

### M4. Face quality is estimated but not enforced strongly

Capture saves the latest embedding if present. It displays quality, but does not enforce a minimum quality threshold before capture.

Impact:

- Low-quality enrollment can reduce recognition reliability.

Recommendation:

- Require minimum face quality before accepting each capture.
- Detect blur, occlusion, multiple faces, and pose limits.

### M5. Single averaged embedding may reduce robustness

The app captures five samples but averages them into one embedding.

Impact:

- Averaging can lose useful variation across pose/lighting.
- A bad sample can degrade the average.

Recommendation:

- Store multiple high-quality embeddings per student.
- Compare live embedding against each template and use best/median score.

### M6. No liveness or anti-spoofing protection

The face-recognition flow does not appear to include liveness checks.

Impact:

- A printed photo or screen replay may be accepted depending on model behavior.

Recommendation:

- Add liveness detection, blink/head movement prompts, or anti-spoof model.
- Keep manual review in the loop.

### M7. Notification permission handling is incomplete for Android 13+

Notifee initialization requests permission generically, but the Android manifest does not explicitly include `POST_NOTIFICATIONS`.

Impact:

- Notifications may not work on Android 13+ without the runtime permission/manifest declaration.

Recommendation:

- Add `android.permission.POST_NOTIFICATIONS` with SDK-aware request handling.

### M8. Large model assets increase APK size

Model assets include a `face_embedding.tflite` file of about 94 MB and `mobilefacenet.tflite` of about 5.2 MB. The implementation appears to require `mobilefacenet.tflite`; the larger model may be unused.

Impact:

- APK size and install time may be unnecessarily large.
- Play Store delivery and lower-end devices may suffer.

Recommendation:

- Remove unused model assets.
- Use ABI splits and asset delivery if needed.
- Quantize/compress models where accuracy allows.

### M9. Main README is still the default React Native template

The README does not describe SmartAttendance-specific setup, credentials, models, test instructions, APK build steps, privacy caveats, or troubleshooting.

Impact:

- Harder onboarding.
- Higher chance that testers miss required setup steps.

Recommendation:

- Replace README with project-specific instructions.

## Low issues

### L1. Many `any` types reduce type safety

Screens and vendor declarations rely on `any` in route/navigation props and models.

Recommendation:

- Use typed React Navigation props.
- Strengthen model types, especially BLOB/embedding types.

### L2. Inline colors and styles make theming harder

Many screens use literal colors and inline styles.

Recommendation:

- Centralize theme tokens using React Native Paper theme.

### L3. Error handling is mostly generic alerts/logging

Many failures show generic alerts or only log to console.

Recommendation:

- Add user-safe error messages.
- Add structured logging for debugging builds.

### L4. Tests exclude `App.test.tsx`

`jest.config.js` ignores `__tests__/App.test.tsx`.

Recommendation:

- Fix mocks and include render/navigation smoke tests.

## Recommended remediation roadmap

### Before giving APK to real testers

1. Install/configure JDK 17.
2. Run `npm ci`.
3. Run tests and lint.
4. Build `assembleDebug`.
5. Remove or clearly label demo credentials.
6. Confirm camera enrollment and scan flows on a physical Android device.

### Before any production pilot

1. Remove hardcoded seed PINs.
2. Add first-run admin setup.
3. Encrypt local database or at least face embeddings.
4. Add PIN lockout/backoff.
5. Add biometric-data consent and deletion controls.
6. Complete class, teacher, settings, and PIN management flows.
7. Add liveness/anti-spoofing or manual verification policy.
8. Implement proper release signing.
9. Enable release minification with tested keep rules.
10. Replace README with project-specific setup and deployment documentation.

### Before public distribution

1. Full privacy/security review.
2. Accessibility testing.
3. Device compatibility testing across low/mid/high Android devices.
4. Performance profiling of camera frame processing.
5. False acceptance / false rejection testing with real enrolled users.
6. Legal review for biometric data and minors.
7. CI pipeline for tests, lint, typecheck, and Android build.

## APK export status

APK was requested but not produced because the local build environment is missing Java/JDK configuration.

To generate a debug APK after configuring the environment:

```powershell
cd E:\projects\SmartAttendance
npm ci
$env:JAVA_HOME = "C:\Path\To\JDK17"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd android
.\gradlew.bat :app:assembleDebug --stacktrace
```

Expected output path:

```text
E:\projects\SmartAttendance\android\app\build\outputs\apk\debug\app-debug.apk
```

Install on a connected Android phone:

```powershell
adb install -r E:\projects\SmartAttendance\android\app\build\outputs\apk\debug\app-debug.apk
```

For a production-style release APK, do not use the current debug signing configuration. Create a release keystore first and update Gradle signing securely.

## Overall rating

Prototype quality: Strong

Production readiness: Low to medium

Primary reason: The core concept and local workflows are well-structured, but security, privacy, release signing, incomplete screens, and local environment/build readiness need significant work before real deployment.
