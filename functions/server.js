require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = require("./index.js");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`FreshZone API running on port ${PORT}`);
});