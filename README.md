# Drivebase customer records

A React/Vite app for automotive customer records. The admin workspace uses Firebase Authentication for sign-in and Cloud Firestore for live viewing, adding, editing, and deleting records.

## Run locally

```sh
npm install
```

Create a local `.env` from `.env.example` and fill in the Firebase web app values if needed:

```sh
cp .env.example .env
```

Vite reads `.env`, not `.env.example`. Restart the dev server after changing environment variables. Then run:

```sh
npm run dev
```

Open the local URL printed by Vite and choose **Admin login**.

## Deploy to Netlify

Import this GitHub repository in Netlify. The included `netlify.toml` sets the Vite build command, publishes `dist`, and rewrites app routes to `index.html`. The build copies the public Firebase web app settings from `.env.example` into `.env`; do not put private credentials there.

After the first deploy, add the deployed site domain (for example, `your-site.netlify.app`) to **Firebase Console → Authentication → Settings → Authorized domains**. Email/password sign-in and Firestore still require the Firebase setup described below.

## Firebase setup

1. Enable the Email/Password provider in Firebase Authentication and create the sign-in accounts you need.
2. Create a Cloud Firestore database.
3. Configure the Firestore rules from `firestore.rules` in the Firebase console or deploy them with the Firebase CLI.
4. Add the Firebase web app configuration to `.env` using the `VITE_FIREBASE_*` variable names in `.env.example`.

This project uses Firebase project `drivebase-customer-records` and Firestore location `us-central1`. The web app configuration is in the ignored local `.env` file.

The app reads the `customers` collection in real time. Firestore rules only permit the customer fields in the form (`certificateNumber`, `date`, `makeBodyType`, `importerName`, `declarationNumber`, `model`, `country`, `chassisNo`, `engineNo`, `color`, `remarks`, `userId`, and `status`), along with `createdAt` and `updatedAt` timestamps. Supported statuses are Pending, In Progress, Valid, Invalid, Cleared, and Hold. New records receive a secure 35-character document ID and timestamps; editing updates that document, and deleting removes it. The record action popover can copy a direct `/record/<document-id>` URL; existing record links remain valid, and destinations require Firebase sign-in. No sample records are inserted automatically, so deleting the final record leaves the collection empty.

Firestore access requires an authenticated Firebase user. Create only the admin sign-in accounts that should access these records.
# drivebase
