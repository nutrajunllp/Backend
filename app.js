require("dotenv").config();
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const errorMiddleware = require('./errors/error');
const app = express();

const server = http.createServer(app);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'index.html'));
});

app.get('/image/:folderName/:imageName', (req, res) => {
  const { imageName, folderName } = req.params;
  const imagePath = path.join(__dirname, `assets/${folderName}/`, imageName);
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(500).send('Error displaying image');
    }
  });
});

// Route imports
const routeIndex = require('./routes/index');
app.use('/api/v1', routeIndex);

app.use(errorMiddleware);
module.exports = { app, server };