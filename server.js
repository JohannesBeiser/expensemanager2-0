const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs').promises;

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

/**
 * Adds an expense to the expenseQueue
 * Gets called via Siri via url
 */
app.get('/expense', (req, res) => {
  let amount = numbersAsTextToNumber(req.query.input);

  let expenseName = removeWordsFromString(req.query.input, ["euro","Euro", "eur", "cent", ...numbersAsText, ...numbersAsText.map(el=>el.toLocaleLowerCase())]).replace(/[0-9€,.]/g, '').trim();
  let expense= {
    amount: amount,
    name: expenseName,
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
