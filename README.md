# Drivebase customer records

A React/Vite app for automotive customer records. The admin workspace uses Firebase Authentication for sign-in and Cloud Firestore for live viewing, adding, editing, and deleting records.

## Run locally

```sh
npm install
```

Create a local `.env` from `.env.example` if one does not already exist, and fill in the Firebase web app values. Then run:

```sh
npm run dev
```

Open the local URL printed by Vite and choose **Admin login**.

## Firebase setup

1. Enable the Email/Password provider in Firebase Authentication and create the sign-in accounts you need.
2. Create a Cloud Firestore database.
3. Configure the Firestore rules from `firestore.rules` in the Firebase console or deploy them with the Firebase CLI.
4. Add the Firebase web app configuration to `.env` using the variable names in `.env.example`.

This project uses Firebase project `drivebase-customer-records` and Firestore location `us-central1`. The web app configuration is in the ignored local `.env` file.

The app reads the `customers` collection in real time. Firestore rules only permit the customer fields in the form (`certificateNumber`, `date`, `makeBodyType`, `importerName`, `declarationNumber`, `model`, `country`, `chassisNo`, `engineNo`, `color`, `remarks`, `userId`, and `status`), along with `createdAt` and `updatedAt` timestamps. Saving a new record creates a document with timestamps; editing updates that document, and deleting removes it. The record action popover can copy a direct `/record/<document-id>` URL; the destination requires Firebase sign-in. No sample records are inserted automatically, so deleting the final record leaves the collection empty.

Firestore access requires an authenticated Firebase user. Create only the admin sign-in accounts that should access these records.
# drivebase
