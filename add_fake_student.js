const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDhzx2r1Kn0oOm824_61Wag5u1bRYfIjkk",
    authDomain: "ial-mobil.firebaseapp.com",
    databaseURL: "https://ial-mobil-default-rtdb.firebaseio.com",
    projectId: "ial-mobil",
    storageBucket: "ial-mobil.firebasestorage.app",
    messagingSenderId: "1083444143779",
    appId: "1:1083444143779:web:c0fe00628210fa0a1c4116"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    await addDoc(collection(db, 'users'), {
        full_name: "Simülasyon Öğrencisi",
        role: "student",
        tc_kimlik: "11111111111"
    });
    console.log("Fake student added.");
    process.exit(0);
}
run();
