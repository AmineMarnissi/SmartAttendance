# No-login mode changelog

The app has been changed to bypass the login/user-selection screen for test builds.

- App startup initializes the database, seeds default data, then bootstraps a default teacher session.
- Navigation opens directly into the main attendance app.
- The auth stack is no longer rendered.
- Logout buttons are removed to prevent returning to a disabled login flow.

Validation should include Jest, TypeScript, lint, and an Android debug build/install.
