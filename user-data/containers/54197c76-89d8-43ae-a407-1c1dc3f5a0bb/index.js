const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config()
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from MozHost!', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/start', (req, res) => {
  res.json({
    "status": "onlin",
    "message": "Servidor esta rodando"
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});