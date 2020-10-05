// Doesn't work: from https://medium.com/@kiesp/playing-with-spotify-api-using-expressjs-bd8f25392ff3

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

require('dotenv').config();
const { ID, SECRET, PORT, CALLBACK_URL } = process.env;

const SpotifyWebApi = require('spotify-web-api-node');
const scopes = ['user-read-private', 'user-read-email','playlist-modify-public','playlist-modify-private'];

const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_API_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  redirectUri: CALLBACK_URL,
});


app.get('/', (req, res) => {
  res.send('Hello world');
});

app.get('/login', (req,res) => {
  var html = spotifyApi.createAuthorizeURL(scopes)
  console.log(html)
  res.send(html+"&show_dialog=true");
})

app.get('/callback', async (req,res) => {
  const { code } = req.query;
  console.log(code);
  try {
    const data = await spotifyApi.authorizationCodeGrant(code)
    const { access_token, refresh_token } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    res.redirect('http://localhost:3001/home');
  } catch(err) {
    res.redirect('/#/error/invalid token');
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT)
})
