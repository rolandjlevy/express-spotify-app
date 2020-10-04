
function getAlbumsLink(artistId) {
  spotifyApi.getArtistAlbums(artistId, { limit: 10, offset: 20 })
    .then(
      (data) => {
        if (data.body.items.length) {
          return ` | see <a href="/albums/${artistId}">albums</a>`;
        } else {
          return '';
        }
      },
      (err) => {
        console.error(err);
      }
    );
}

function getArtistDetails(artistArray) {
  return artistArray.map(artist => {
    const img = artist.images.length ? `<li><img src="${artist.images[2].url}" width="${artist.images[2].width}"></li>` : '';
    // const albumsLink = await getAlbumsLink(artist.id)
    return `<li><a href="${artist.external_urls.spotify}" target="_blank">${artist.name}</a> on Spotify | see <a href="/albums/${artist.id}">albums</a></li>
      `;
  }).join('');
}

function renderPaginationLinks(search, page, total) {
  let str = '';
  const totalPages = Math.ceil(total / Number(LIMIT));
  if (totalPages == 1) return '';
  str += `Go to page: `;
  let counter = 0;
  while (counter < totalPages) {
    const col = page == counter ? 'red' : 'black';
    str += `<a href="/artists?search=${search}&page=${counter}&offset=${counter * Number(LIMIT)}" style="color:${col}">${counter + 1}</a> | `;
    counter++;
  }
  return str;
}

function getImage(artist) {
  artist.images.length ? `<li><img src="${artist.images[2].url}" width="${artist.images[2].width}"></li>` : '';
}