const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./key.json');
const bcrypt = require('bcrypt');
const ejs = require('ejs');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/public/signup.html');
});

app.post('/signupsubmit', async (req, res) => {
  const { FullName, Email, Password } = req.body;
  const existingUser = await db.collection('todo').where('Email', '==', Email).get();

  if (!existingUser.empty) {
    return res.status(400).send('Email already in use');
  }

  try {
    const hashedPassword = await bcrypt.hash(Password, 10);
    await db.collection('todo').add({
      FullName,
      Email,
      Password: hashedPassword,
    });

    res.sendFile(__dirname + '/public/home.html');
  } catch (error) {
    console.error('Error adding document: ', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/loginsubmit', async (req, res) => {
  const { Email, Password } = req.body;
  const userQuery = await db.collection('todo').where('Email', '==', Email).get();

  if (userQuery.empty) {
    return res.status(401).send('Login Fail');
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();
  const isPasswordValid = await bcrypt.compare(Password, userData.Password);

  if (isPasswordValid) {
    res.render('dashboard', { result: null });
  } else {
    res.status(401).send('Login Fail');
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { result: null });
});

app.post('/dashboard', (req, res) => {
  const amount = req.body.amount;
  const from = req.body.from;
  const to = req.body.to;
  const apiKey = '4ba15d4365e456a7b07af30a';

  axios
    .get(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}/${amount}`)
    .then((response) =>
      res.render('dashboard', { result: response.data.conversion_result })
    )
    .catch((err) => console.log(err));
});

app.listen(3000, () => {
  console.log('Successfully running');
});
