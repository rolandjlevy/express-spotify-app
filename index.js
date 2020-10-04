const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const app = express();
const cors = require('cors');
app.use(cors());

const bp = require("body-parser");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());

require('dotenv').config();
const { SPOTIFY_API_ID, SPOTIFY_CLIENT_SECRET, PORT, LIMIT } = process.env;

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_API_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://express-spotify-app.rjlevy.repl.co/callback'
});

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']);
  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err);
  });

app.get('/', (req, res) => {
  res.send(`
    <h3><a href="/login">Login to Spotify</a></h3>
    <a href="/search">Go to search</a>
  `);
});

app.get('/search', (req, res) => {
  res.send(`
    <h3>Search artists by</h3>
    <form method="POST" action="/artists">
      <input type="text" name="search" placeholder="Enter any word..." />
      <button type="submit">Submit</button>
    </form>
  `);
});

app.get('/artists', (req, res) => {
  const { search, offset } = req.query;
  getAllArtists(search, offset, res);
});

app.post('/artists', (req, res) => {
  getAllArtists(req.body.search, 0, res);
});

function getAllArtists(search, offset, res) {
  spotifyApi.searchArtists(search, { limit: LIMIT, offset })
    .then(data => {
      const artistArray = data.body.artists.items;
      const artist = data.body.artists.items[0];
      const artistDetails = getArtistDetails(artistArray);
      const pagination = renderPagination(search, data.body.artists.total);
      res.send(`
      <h3>${data.body.artists.total} results for artists by "${search}"</h3>
      <p>
        ${pagination}
      </p>
      <a href="/search">⬅ Go back to search</a>
      <ul>
        ${artistDetails}
      </ul>
    `);
    }, function(err) {
      console.error(err);
    });
}

function renderPagination(search, total) {
  let str = '';
  const totalPages = Math.ceil(total / Number(LIMIT));
  let counter = 0;
  while (counter < totalPages) {
    str += `<a href="/artists?search=${search}&offset=${counter * Number(LIMIT)}">${counter + 1}</a> | `;
    counter++;
  }
  return str;
}

function getArtistDetails(artistArray) {
    return artistArray.map(artist => {
    const img = artist.images.length ? `<li><img src="${artist.images[2].url}" width="${artist.images[2].width}"></li>` : '';
    return `<li><a href="${artist.external_urls.spotify}" target="_blank">${artist.name}</a> on Spotify | see <a href="/albums/${artist.id}">albums</a></li>
      `;
  }).join('');
}

app.get('/albums/:artistId', (req, res) => {
  const artistId = req.params.artistId;
  spotifyApi.getArtistAlbums(
    artistId,
    { limit: 10, offset: 20 }
  )
    .then(
      (data) => {
        console.log('Artist albums', data.body);
      },
      (err) => {
        console.error(err);
      }
    );
});

app.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
  const url = spotifyApi.createAuthorizeURL(scopes) + "&show_dialog=true";
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code)
    const { access_token, refresh_token } = data.body;
    console.log({ access_token, refresh_token })
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    console.log('The credentials are ' + JSON.stringify(spotifyApi.getCredentials()));
    res.redirect('/search');
  } catch (err) {
    res.redirect('/#/error/invalid token');
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT)
});
