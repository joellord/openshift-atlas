const express = require("express");
require("dotenv").config()
const cors = require("cors");
const serviceBindings = require('kube-service-bindings');

const PORT = process.env.PORT;
let CONN_STR = null;
let connectionBindings = null;

try {
  // check if the deployment has been bound to a MongoDB instance through
  // service bindings. If so use that connect info
  connectionBindings = serviceBindings.getBinding('MONGODB', 'mongodb');
} catch (err) { // proper error handling here
  connectionBindings = null;
  CONN_STR = process.env.CONN_STR;
};

let DB_CONNECTED = false;

const getMongoDB = async () => {
  const MongoClient = require('mongodb').MongoClient;
  if (CONN_STR) {
    console.log("Connecting to database using provided connection string");
  }
  if (connectionBindings) {
    console.log("Connecting to database using connection bindings");
  }
  let db;
  try {
    let connectionString = connectionBindings ? connectionBindings.url : CONN_STR;
    let logConnString = connectionString.replace(/\/(.*:.*)@/, "//----:----@");
    console.log(`Connecting to database using ${logConnString}`);
    const client = await MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    db = await client.db("mern-k8s");
    DB_CONNECTED = true;  
  } catch (e) {
    console.log(e.toString());
  }
  return db;
}
let db;
getMongoDB().then(_db => db = _db);

let app = express();
app.use(cors())
app.use(express.json());

const log = (route, message) => {
   const now = new Date();
   const date = `${now.getDay()}/${(now.getMonth()+1).toString().padStart(2, "0")}/${now.getFullYear()}`;
   const time = `${(now.getHours()).toString().padStart(2, "0")}:${(now.getMinutes()).toString().padStart(2, "0")}:${(now.getSeconds()).toString().padStart(2, "0")}`;
   const log = `[${date} ${time}] - (${route}) - ${message}`;
   console.log(log);
}

app.get("/healthz", (req, res) => {
  log("/healthz", "GET request");
  res.send({status: "Ok", dbConnected: DB_CONNECTED}).status(200);
});

app.get("/entries", async (req, res) => {
  log("/entries", "GET request");
  let entries = [];
  try {
    let collection = await db.collection("entries")
    entries = await collection.find({}).toArray();
  } catch (e) {
    log("/entries", e.toString());
  }
  res.send(entries).status(200);
});

app.post("/entry", async (req, res) => {
  log("/entry", `POST request ${JSON.stringify(req.body)}`);
  let result;
  try {
    let collection = await db.collection("entries");
    result = await collection.insertOne(req.body);
  } catch (e) {
    log("/entry", e.toString());
  }
  res.send(result).status(201);
});

app.get("/flush", async (req, res) => {
  log("/flush", "GET request");
  let result;
  try {
    let collection = await db.collection("entries");
    result = await collection.deleteMany({});
  } catch(e) {
    log("/flush", e.toString());
  }
  res.send(result).status(200);
})

app.listen(PORT, () => console.log(`Server started on port ${PORT}. Use Ctrl-C to stop the server.`));