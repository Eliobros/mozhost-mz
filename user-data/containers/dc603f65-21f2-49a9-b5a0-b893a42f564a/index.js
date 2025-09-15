const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.json({
    "status": "success",
    "message": "Api rodando perfeitamente CEO",
    "version": "1.1.0"
  })
})