const admin = require('firebase-admin');

// ⚠️ IMPORTANT: You must initialize the Firebase Admin SDK with a service account key.
// Do NOT commit the service account key to the repository.
// Run this script locally to set the 'admin' custom claim for your superadmin account.

// const serviceAccount = require('./path-to-your-service-account-key.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

async function setAdminClaim(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Successfully set admin claim for user: ${uid}`);
  } catch (error) {
    console.error(`Error setting admin claim: ${error}`);
  }
}

// Replace with your actual superadmin UID from Firebase Console
const SUPERADMIN_UID = "YOUR_SUPERADMIN_UID_HERE";

// UNCOMMENT TO RUN:
// setAdminClaim(SUPERADMIN_UID);
