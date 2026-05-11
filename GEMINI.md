# RegistreIntelligent Project Context

RegistreIntelligent (formerly SmartAttendance) is a local-first React Native application designed for school attendance management using on-device face recognition. It enables teachers to scan classrooms, automatically detect student presence via AI, and manage attendance records without requiring a constant internet connection.

## 🏗 Architecture Overview

The project follows a modular service-oriented architecture with a focus on local persistence and real-time AI processing.

### Core Stack
- **Framework:** React Native (0.78.3) with TypeScript.
- **AI/ML:** 
  - `react-native-fast-tflite` for TensorFlow Lite inference (using `mobilefacenet.tflite`).
  - `react-native-vision-camera` + `vision-camera-face-detector` for real-time camera processing.
- **Database:** `@op-engineering/op-sqlite` (SQLite) for structured data and `react-native-mmkv` for key-value storage.
- **State Management:** `zustand` for authentication and session state.
- **UI:** `react-native-paper` for material components, `@shopify/react-native-skia` for custom graphics, and `victory-native` for analytics charts.
- **Navigation:** `@react-navigation` (Stack, Tabs, Drawer).

### Directory Structure
- `src/assets/models/`: TFLite models for face detection and embedding.
- `src/components/`: Reusable UI components, including analytics cards and charts.
- `src/hooks/`: Custom hooks like `useFaceRecognition` for abstracting camera/AI logic.
- `src/navigation/`: Navigation configuration and route types.
- `src/screens/`: Feature-based screens (Admin, Teacher, Auth, Enrollment).
- `src/services/`: Core business logic:
    - `attendance/`: Session management and record processing.
    - `database/`: SQLite repositories and schema initialization.
    - `faceRecognition/`: AI model loading, embedding generation, and matching.
- `src/store/`: Zustand stores.
- `src/types/`: TypeScript interfaces for models and vendor declarations.

## 🛠 Building and Running

### Prerequisites
- Node.js (>= 18)
- JDK 17 (required for Android builds)
- Android SDK / Xcode for iOS

### Key Commands
- `npm start`: Starts the Metro bundler.
- `npm run android`: Builds and runs the app on a connected Android device/emulator.
- `npm run ios`: Builds and runs the app on an iOS simulator.
- `npm test`: Runs the Jest test suite.
- `npm run lint`: Runs ESLint to check for code style issues.
- `npm run lint-fix`: Automatically fixes linting errors.

## 📝 Development Conventions

- **Database:** Use the repository pattern found in `src/services/database/`. Always use parameterized queries to prevent SQL injection.
- **AI/Worklets:** Face recognition logic often runs in UI/VisionCamera worklets. Use the `'worklet';` directive for functions intended to run on the camera thread.
- **Types:** Strictly define models in `src/types/models.ts`. Avoid using `any` where possible.
- **State:** Use Zustand for global state. Prefer local component state for UI-only toggles.
- **Testing:** Add tests for new business logic in `__tests__/`. Use existing similarity and attendance tests as templates.

## 🔒 Security & Data
- **Authentication:** Local PIN-based authentication.
- **Seed Data:** Initial demo users are created in `src/services/database/seedData.ts`.
    - Admin: PIN `1234`
    - Teacher: PIN `5678`
- **Privacy:** Biometric embeddings and student thumbnails are stored locally in the SQLite database as BLOBs.

## 🚀 Known Limitations (Prototype Status)
- Some screens in the Admin and Settings modules are currently placeholders.
- Biometric data is stored unencrypted in the local database.
- Liveness detection (anti-spoofing) is not yet implemented.
