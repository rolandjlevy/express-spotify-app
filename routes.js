const express = require('express')
const router = express.Router();
require('dotenv').config();

const { SPOTIFY_API_ID, SPOTIFY_CLIENT_SECRET, LIMIT } = process.env;

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_API_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://express-spotify-app.rjlevy.repl.co/callback'
});

spotifyApi.clientCredentialsGrant()
  .then((data) => {
    spotifyApi.setAccessToken(data.body['access_token']);
  }, function(err) {
    console.log('Error retrieving an access token', err);
  });

router.get('/', (req, res) => {
  res.send(`
    <h3><a href="/login">Login to Spotify</a></h3>
    <a href="/search">Go to search</a>
  `);
});

router.get('/search', (req, res) => {
  res.send(`
    <h3>Search artists by</h3>
    <form method="POST" action="/artists">
      <input type="text" name="search" placeholder="Enter any word..." />
      <button type="submit">Submit</button>
    </form>
  `);
});

router.get('/artists', (req, res) => {
  const { search, page, offset } = req.query;
  getAllArtists(search, page, offset, res);
});

router.post('/artists', (req, res) => {
  getAllArtists(req.body.search, 0, 0, res);
});

router.get('/albums/:artistId', (req, res) => {
  spotifyApi.getArtistAlbums(req.params.artistId, { limit: 10, offset: 0 })
    .then(
      (data) => {
        res.json(data.body.items);
      },
      (err) => {
        console.error(err);
      }
    );
});

router.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
  const url = spotifyApi.createAuthorizeURL(scopes) + "&show_dialog=true";
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code)
    const { access_token, refresh_token } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    console.log('The credentials are ' + JSON.stringify(spotifyApi.getCredentials()));
    res.redirect('/search');
  } catch (err) {
    res.redirect('/#/error/invalid token');
  }
});

function getAllArtists(search, page, offset, res) {
  spotifyApi.searchArtists(search, { limit: LIMIT, offset })
    .then(data => {
      Promise.all(
        data.body.artists.items.map(artist => {
          return spotifyApi.getArtistAlbums(artist.id, { limit: 10, offset: 20 })
            .then(
              (data) => getArtistAndAlbums(data.body.items, artist),
              (err) => console.error(err))
        })
      ).then(artistDetails => {
        const totalResults = data.body.artists.total;
        res.send(`
          <h3>${totalResults} results for artists by "${search}"</h3>
          <p><a href="/search">⬅ back to search</a></p>
          ${pagination(search, page, totalResults)}
          <ul>${artistDetails.join('')}</ul>`
        );
      }, (err) => {
        console.error(err);
      }
    );
  });
}

function getArtistAndAlbums(albumArray, artist) {
  const albumLink = albumArray.length ? ` | see <a href="/albums/${artist.id}">albums</a>` : '';
  const li = `<li><a href="${artist.external_urls.spotify}" target="_blank">${artist.name}</a> on Spotify${albumLink}</li>`;
  return li;
}

function pagination(search, page, total) {
  let str = '';
  const totalPages = Math.ceil(total / Number(LIMIT));
  if (totalPages == 1) return '';
  str += `Go to page: <select onchange="location=this.options[this.selectedIndex].value">`;
  let counter = 0;
  while (counter < totalPages) {
    const selected = page == counter ? ' selected' : '';
    str += `<option value="/artists?search=${search}&page=${counter}&offset=${counter * Number(LIMIT)}"${selected}>${counter + 1}</option>`;
    counter++;
  }
  str += `</select>`;
  return str;
}

module.exports = router;