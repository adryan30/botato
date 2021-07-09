import * as admin from "firebase-admin";

const app = admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(Buffer.from(process.env.FIREBASE_CREDS, "base64").toString())
  ),
});

export const db = app.firestore();
