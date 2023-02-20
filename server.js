const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs').promises;


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtmZFoZ2JrByCSBtni6uM-mFBtH7KdcXc",
  authDomain: "expensemanager-671f8.firebaseapp.com",
  projectId: "expensemanager-671f8",
  storageBucket: "expensemanager-671f8.appspot.com",
  messagingSenderId: "816296169142",
  appId: "1:816296169142:web:c6cfcf85645097e0cea017",
  measurementId: "G-J7EX3487SB"
};

// Initialize Firebase
const app2 = initializeApp(firebaseConfig);
const analytics = getAnalytics(app2);


// Port Number
const port = process.env.PORT || 3000;

// CORS Middleware
app.use(cors());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'frontend/dist/frontend')));

app.get('/', (req, res) => {
  console.log("endpoint reached")
  res.send('invaild endpoint lel');
});

let expenses= []
var numbersAsText = ["Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Zwölf"];
// var numbersAsText = ["eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Zwölf"];

let foodTrigger=["Rewe", "Lidl", "Walmart", "Kaufland", "Grocery", "Groceri", "Lebensmittel", "Wocheneinkauf", "Netto", "Spar", "Aldi", "Edeka", "Bäcker","Döner", "Restaurant", "Pizza", "Sushi", "essen gehen", "Burger", "Pommes", "fries", "mc donalds", "kfc", "subway", "Buffet"].map(el=>el.toLowerCase());
let accommodationTrigger = ["Hotel", "Motel", "Lodge","Hostel","Camping", "zelten", "tenting", "campen","Miete", "rent"].map(el=>el.toLowerCase());
let transportTrigger = ["taxi", "uber", "bla bla", "blabla","schiff", "boat", "fähre", "ferry", "boot","Flight", "flug", "flugzeug", "airplane","bus","zug", "train", "bahn"].map(el=>el.toLowerCase());
let otherTrigger = ["barber", "haircut", "hairdresser", "friseur", "haarschnitt","post", "usps", "dhl", "fedex", "ups", "paket", "versand","package","gift", "geschenk", "donation", "spende"].map(el=>el.toLowerCase());
let additionalTriggers= [  "coffee", "kaffee","drinks", "cocktail", "bar", "chips", "water", "wasser" ,"snacks", "Getränke", "bakery", "kino" , "cinema","movie", "film"]; // random / added later
let categoryTrigger= [...foodTrigger,...accommodationTrigger,...transportTrigger,...otherTrigger,...additionalTriggers].map(el=>el.toLowerCase()); // all the triggers that will resolve a category

const CategorySynonyms = {
  "food": ["food", "essen", "verpflegung"],
  "transport": ["transport", "transportation"],
  "accommodation": ["accommodation", "unterkunft"],
  "multimedia": ["multimedia"],
  "invest": ["invest", "investment", "investieren", "investierung"],
  "clothingGear": ["gear", "ausrüstung", "kleider", "kleidung", "clothing", "clothes"],
  "healthInsurance": ["health", "insurance", "gesundheit und versicherung", "gesundheit", "versicherung"],
  "general": ["general", "allgemein", "allgemeines"]
};

const HardcodedCategories = {
  Food: 1637006412319,
  Transport: 1637006412320,
  Accommodation: 1637006412321,
  Multimedia: 1637006412322,
  HealthInsurance: 1637006412324,
  General: 1637006412325,
  ClothingGear: 1637006412326,
  Invest: 1638217648875,
}
/**
 * Adds an expense to the expenseQueue
 * Gets called via Siri via url
 */
app.get('/expense', (req, res) => {
  console.log(req.query)
  if(!req.query.category && !categoryTrigger.some(trigger=> req.query.input.toLowerCase().includes(trigger))){
    console.log("category cant be interpolated from string - asking for categroy through siri")
    res.send("category missing")
    return;
  }

  if(req.query.category){
    console.log("category found in request " + req.query.category)
    req.query.category = req.query.category.toLowerCase().trim();
  }

  let amount =0;
  let expenseName = "";
  if(req.query.amount){
    amount = parseFloat(req.query.amount);
    expenseName = req.query.input
  }else{
    amount = numbersAsTextToNumber(req.query.input);
    expenseName = removeWordsFromString(req.query.input, ["euro","Euro", "eur", "cent", ...numbersAsText, ...numbersAsText.map(el=>el.toLocaleLowerCase())]).replace(/[0-9€,.]/g, '').trim();
  }

  let expense= {
    amount: amount,
    name: expenseName,
  }

  if(req.query.category){
    console.log("category received: " + req.query.category)
    console.log(CategorySynonyms.food)
    if(CategorySynonyms.food.some(el=>req.query.category.includes(el))){
      console.log("category food detected");
      expense.category = HardcodedCategories.Food
    }
    if(CategorySynonyms.transport.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.Transport
    }
    if(CategorySynonyms.accommodation.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.Accommodation
    }
    if(CategorySynonyms.multimedia.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.Multimedia
    }
    if(CategorySynonyms.healthInsurance.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.HealthInsurance
    }
    if(CategorySynonyms.general.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.General
    }
    if(CategorySynonyms.clothingGear.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.ClothingGear
    }
    if(CategorySynonyms.invest.some(el=>req.query.category.includes(el))){
      expense.category = HardcodedCategories.Invest
    }
  }

  console.log(expense)

  if(expense.name && expense.amount){
    expenses.push(expense)
    res.send(`${expense.name} hinzugefügt. (${expenses.length} in queue)`);
  }else{
    res.send(`Ausgabe NICHT hinzugefügt - amount:${expense.amount}, name: ${expense.name}`);
  }
});


//parses "five dollar" to "5 dollar"
function numbersAsTextToNumber(text) {
  numbersAsText.forEach((num, i)=>{
    text = text.replace(num, i+1)
  });
  numbersAsText.forEach((num, i)=>{
    text = text.replace(num.toLocaleLowerCase(), i+1)
  });

  text = text.replace(",",".")
  text= text.replace(/[a-zA-Z€]/g, '').replace('euro', '').replace('Euro', '');

  return parseFloat(text)
}


function removeWordsFromString(text, words){
  words.forEach(word=>text = text.replace(word, ''));
  return text;
}

/**
 * Returns all expenses to the frontend where they are being saved locally
 */
app.get('/expenseQueue', (req, res) => {
  console.log("endpoint reached")
  res.send({expenses});
});

/**
 * clears all memorized expenses that have been added via siri.
 * Gets called when frontend successfully saved all expenses and explicitly calls this
 */
app.get('/clearExpenseQueue', (req, res) => {
  expenses = [];
  res.send({success:true});
});






app.get('/audio', (req, res) => {
  console.log("endpoint audio reached")
res.send('audio endpoint');
});


const client = new speech.SpeechClient();


app.post('/api/audio', (req, res) => {
  let chunks = [];
  req.on('data', (chunk) => {
      chunks.push(chunk)
  });
  req.on('end', async () => {
      let buffer = Buffer.concat(chunks);   

      // Reads a local audio file and converts it to base64
      const audioBytes = buffer.toString('base64');
    
      // The audio file's encoding, sample rate in hertz, and BCP-47 language code
      const audio = {
        content: audioBytes,
      };
      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'de-DE',
      };
      const request = {
        audio: audio,
        config: config,
      };
    
      // Detects speech in the audio file
      const [response] = await client.recognize(request);
      const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
      console.log(`Transcription: ${transcription}`);
      res.send({
          transcription: transcription
      });
  });
});



// Creates a client

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/frontend/index.html'));
});


// Start Server
app.listen(port, () => {
  console.log('Server started on port '+port);
});
