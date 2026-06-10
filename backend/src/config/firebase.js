const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;
let isMock = true;

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isMock = false;
    console.log('🔥 Firebase Admin SDK initialized successfully using serviceAccountKey.json');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    isMock = false;
    console.log('🔥 Firebase Admin SDK initialized successfully via environment variables');
  } else {
    console.log('⚠️ Firebase credentials missing. Push Notification Service falling back to simulated logger.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK. Falling back to simulated logger.', error.message);
}

module.exports = {
  admin,
  firebaseApp,
  isMock
};
