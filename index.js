const express = require('express');
const path = require('path');
const routes = require('./routes');
const app = express();

app.engine('.html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

require('dotenv').config();
const { PORT } = process.env;

app.use('/', routes);
app.use('/search', routes);
app.use('/artists', routes);
app.use('/albums/:artistId', routes);
app.use('/login', routes);
app.use('/callback', routes);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.listen(PORT, (err) => {
  if (err) console.log(err); 
  console.log('Listening on port', PORT)
});