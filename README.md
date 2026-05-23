# Husky Planner

A small React + Vite planner app that tracks classes and assignments.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the app in your browser at `http://127.0.0.1:5173`.
or at  Local:   http://localhost:5173/

## Google sign-in configuration

The app normally uses Google Identity Services to sign in users.

To enable Google login, create a `.env` file in the project root and add:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Then restart the dev server.

### If you do not have a Google client ID

The app now supports a local fallback sign-in path.

- If `VITE_GOOGLE_CLIENT_ID` is missing or Google sign-in fails,
  the auth screen will show a button to continue without Google.
- This lets you still use the planner locally without configuring OAuth.

## Notes

- Planner data is stored locally in the browser.
- Google sign-in is optional for local development.
