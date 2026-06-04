# Husky Planner

Husky Planner is a lightweight student planner app built for UW students to manage classes, assignments, and personal task priorities in one place. It helps you keep deadlines visible, sort tasks by urgency, and stay organized across each quarter.

- 🔗 Live app: https://husky-planner.vercel.app/
- 📌 Repository: https://github.com/Adhi7783/Husky-Planner

## Why this project exists

Students need a simple planner that reflects the pace of campus work and keeps academic commitments visible. Husky Planner is designed to help:

- Track classes and assignments in a single dashboard
- Prioritize tasks based on due dates and importance
- Store planner data locally for fast, private use
- Support optional Google sign-in while still working without OAuth

## Dashboard 
<img width="508" height="574" alt="Screenshot 2026-06-04 003021" src="https://github.com/user-attachments/assets/0b69f365-6760-4b87-84b5-0389318f0e2e" />

## Key features

- Add and manage classes with custom names and sections
- Add assignments with due dates and course association
- View a prioritized task list for what needs attention first
- Local browser storage for data persistence without a backend
- Optional Google Identity sign-in fallback for direct access

## Deployment and web presence

This app is deployed and publicly accessible at:

https://husky-planner.vercel.app/

This README functions as the project landing page with:

- Project purpose and audience
- Live deployment link
- Feature overview and user guide
- Development setup and configuration instructions

## How to use the app

1. Open the deployed site or run locally.
2. Add your classes using the "Add Class" form.
3. Add assignments and attach them to a class.
4. Review the priority list to see upcoming work.
5. Use the fallback sign-in option if you do not configure Google OAuth.

## Tech stack

- React + TypeScript
- Vite
- Browser local storage
- Optional Google Identity Services
- Optional Groq AI sorting support



## Project architecture
User -> React Frontend -> Zustand Store -> Groq API -> Priority Rankings

The app follows a component-driven structure:

- `src/App.tsx` – application shell and route layout
- `src/components/` – UI pages and forms
- `src/store/plannerStore.ts` – app state and local storage logic
- `src/services/` – optional external service integrations
- `src/types/index.ts` – application data models and types

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the app in your browser at `http://127.0.0.1:5173` or `http://localhost:5173`.

## Configuration

### Google sign-in (optional)

To enable Google Identity Services for sign-in, create a `.env` file in the project root and add:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Then restart the dev server.

### Groq API integration (optional)

To enable the assignment sorter with Groq, add a Groq API key to `.env`:

```env
VITE_GROQ_API_KEY=your-groq-api-key
```

Optional:

```env
VITE_GROQ_MODEL=llama-3.1-8b-instant
```

Then restart the dev server.

## Notes

- Planner data is stored locally in the browser.
- Google sign-in is optional and the app includes a local fallback path.
- The deployed version is hosted on Vercel for easy access by users and reviewers.
- During implementation we discovered UW Canvas API access limitations for student-developed applications. Because the project depended on institutional API permissions that were unavailable within the course timeline, we pivoted to a manual assignment-entry workflow while preserving the project's core goal: helping UW students prioritize academic work using AI.

## Security notes

- **Google ID token**: The token returned by Google Sign-In is decoded client-side
  to extract name, email, and subject. The signature, `aud`, and `exp` fields are
  not verified — this is acceptable for a local-storage-only app with no backend,
  but should not be used as the basis for any server-side trust decisions.
