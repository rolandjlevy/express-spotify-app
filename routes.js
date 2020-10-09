const express = require('express')
const router = express.Router();
require('dotenv').config();
const exampleTerm = 'Jobim';

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
  .then(
    (data) => {
    spotifyApi.setAccessToken(data.body['access_token']);
  }, (err) => {
    console.log('Error retrieving an access token', err);
  });

router.get('/', (req, res) => {
  res.send(`
    <h3><a href="/login">Login to Spotify</a></h3>
    ${getSearchForm()}
  `);
});

router.get('/search', (req, res) => {
  res.send(`
    <h3>Search artists by</h3>
    ${getSearchForm()}
  `);
});

router.get('/artists', (req, res) => {
  const { search, page, offset } = req.query;
  getAllArtists(search, page, offset, res);
});

router.post('/artists', (req, res) => {
  getAllArtists(req.body.search, 0, 0, res);
});

function getSearchForm() {
  return `
    <form method="POST" action="/artists">
      <input type="text" name="search" value="${exampleTerm}" placeholder="Enter..." />
      <button type="submit">Submit</button>
    </form>`;
}

function getAllArtists(search, page, offset, res) {
  spotifyApi.searchArtists(search, { limit: LIMIT, offset })
    .then(data => {
      Promise.all(
        data.body.artists.items.map(artist => {
          return spotifyApi.getArtistAlbums(artist.id)
            .then(
              (data) => getArtistAndAlbums(data.body.items, artist),
              (err) => console.error(err))
        })
      ).then(artistDetails => {
        const totalResults = data.body.artists.total;
        res.send(`
          <h2>${Number(totalResults).toLocaleString()} results from searching for the artist "${search}"</h2>
          <p><a href="/search">⬅ Back to search</a></p>
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
  let str = `
    <details>
      <summary style="margin-bottom:10px; cursor:pointer; outline:none;">View ${albumArray.length} albums</summary>
      <ul style="max-height:150px; overflow-y:auto; width:fit-content;">`;
  str += albumArray.map(album => {
        const img = `<img src="${album.images[2].url}" style="width:32px" />`;
        return `
        <li style="margin:5px 0;">
          <a href="${album.external_urls.spotify}" target="_blank">${img} ${album.name}</a>
        </li>`}).join('');
  str += `
      </ul>
      <p>See <a href="/albums/${artist.id}" target="_blank">data for albums</a></p>
    </details>
  `;
  const li = `<li><h4 style="margin-bottom:10px">See <a href="${artist.external_urls.spotify}" target="_blank">${artist.name}</a> on Spotify</h4>${albumArray.length ? str : ''}</li>`;
  return li;
}

router.get('/albums/:artistId', (req, res) => {
  spotifyApi.getArtistAlbums(req.params.artistId, { limit: LIMIT, offset: 0 })
    .then(
      (data) => res.json(data.body.items),
      (err) => console.error(err)
    );
});

router.get('/albumtracks/:albumId', (req, res) => {
  // A track object comes with a preview_url, which is the source for a 30 second preview of a particular song. You can plug this into an HTML audio tag, and it will play the previe
  spotifyApi.getAlbumTracks(req.params.albumId, { limit: LIMIT, offset: 0 })
    .then(
      (data) => res.json(data.body.items),
      (err) => console.error(err)
    );
});

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

router.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
  const url = spotifyApi.createAuthorizeURL(scopes) + "&show_dialog=true";
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const credentials = JSON.stringify(spotifyApi.getCredentials());
  try {
    const data = await spotifyApi.authorizationCodeGrant(code)
    const { access_token, refresh_token } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    // console.log(`credentials are: ${credentials}`);
    res.redirect('/search');
  } catch (err) {
    res.redirect('/#/error/invalid token');
  }
});

module.exports = router;