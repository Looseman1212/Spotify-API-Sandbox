const redirect_uri = 'http://127.0.0.1:8000/index.html' // Redirect uri

let clientId = ''
let clientSecret = ''

const AUTHORIZE = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'

function onPageLoad() {
  accessToken = localStorage.getItem('accessToken');
  refreshToken = localStorage.getItem('refreshToken');

  if (window.location.search.length > 0){
    clientId = localStorage.getItem('clientId');
    clientSecret = localStorage.getItem('clientSecret');
    handleRedirect();
  };

  if (accessToken != null && refreshToken != null) {
    hideAuthShowSearch();
  };
}

function requestAuthorization() {
  console.log('getting authorization token')
  clientId = document.getElementById('clientId').value;
  clientSecret = document.getElementById('clientSecret').value;
  localStorage.setItem('clientId', clientId);
  localStorage.setItem('clientSecret', clientSecret); // do not share your client secret with any users

  let url = AUTHORIZE;
  url += '?client_id=' + clientId;
  url += '&response_type=code';
  url += '&redirect_uri=' + encodeURI(redirect_uri);
  url += '&show_dialog=true';
  url += '&scope=user-read-playback-state playlist-read-private user-follow-read user-read-currently-playing user-read-email user-top-read user-library-read';
  window.location.href = url; // show spotify's authoization screen
}

function handleRedirect() { // handles functions that are meant to occur after the spotify redirect
  let authToken = parseAuthToken();
  console.log(authToken);
  fetchAccessToken(authToken);
  window.history.pushState({}, document.title, "/" + "index.html"); // reverts url back to original state
}

function parseAuthToken() { // parsing URL with URL params
  console.log("Parsing url for access/authorization token")
  const queryString = window.location.search;
  if (queryString.length > 0) {
    const urlParams = new URLSearchParams(queryString);
    let authToken = urlParams.get('code');
    return authToken;
  } else {
    console.log("No access token found")
  };
}

function fetchAccessToken(authToken) { // build body for post request
  // create body for post request
  let body = 'grant_type=authorization_code';
  body += '&code=' + authToken;
  body += '&redirect_uri=' + encodeURI(redirect_uri);
  body += '&client_id=' + clientId;
  body += '&client_secret=' + clientSecret;
  requestAccessRefreshTokens(body);
}

function requestAccessRefreshTokens(body) { // creates the xmlhttprequest and hands in the body made previously
  // send xmlhttprequest to spotify
  let request = new XMLHttpRequest();
  request.open('POST', TOKEN, true);
  request.setRequestHeader('Authorization', 'Basic ' + btoa(clientId + ':' + clientSecret));
  request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  request.send(body);
  request.onload = handleAccessRefreshTokenResponse; // onload points to function that will handle (and be given) the response
}

function handleAccessRefreshTokenResponse() { // .onload instance method gives over the XMLHttpRequest response to this function
  if (this.status == 200) {
    let data = JSON.parse(this.responseText);
    // console.log(data)
    let accessToken = data.access_token;
    let refreshToken = data.refresh_token;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    console.log("Access token: " + accessToken);
    console.log("Refresh token: " + refreshToken);
    onPageLoad();
  } else {
    // try to log error if it is not a 200 response
    console.log(this.responseText);
  }
}

function hideAuthShowSearch() { // hides the authorization form and shows the search bar when auth token is found
  document.getElementById('auth-form').style.display = 'none';
  document.querySelector('.search-toolbar-container').style.display = 'flex';
  document.getElementById('authorised').style.display = 'block';
}

function checkAccessTokenValid(url) { // checks if the access token is valid
  let request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.setRequestHeader(`Authorization`, `Bearer ${accessToken}`);
  request.send();
  request.onload = function() {
    if (this.status == 200) {
      console.log('current access token is valid');
      return true;
    } else if (this.status == 401) {
      console.log('current access token is invalid');
      return false;
    }
  }
}


function searchSpotify() {
  let search = document.getElementById('search').value;
  let url = 'https://api.spotify.com/v1/search?q=' + search + '&type=' + 'artist';
  // if else statement to check if the access token is expired
  if (checkAccessTokenValid(url)) {
    fetchSpotifyData(url);
  } else {
    console.log('updating access token');
    handleAuthTokenExipry();
    fetchSpotifyData(url);
  }
}

function fetchSpotifyData(url) {
  let request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.setRequestHeader('Authorization', 'Bearer ' + accessToken);
  request.send();
  request.onload = handleSpotifySearchResponse;
}

function handleSpotifySearchResponse() { // maybe could pass this the original url so that it can be used in the refresh token function
  if (this.status == 200) {
    let data = JSON.parse(this.responseText);
    let name = data.artists.items[0].name
    let genres = data.artists.items[0].genres
    let spotify_link = data.artists.items[0].external_urls.spotify
    let followers = data.artists.items[0].followers.total
    let image_url = data.artists.items[0].images[0].url
    // console.log(`Name: ${name}, Genres: ${genres}, Spotify Link: ${spotify_link}, Followers: ${followers}, Image: ${image_url}`)
    revealResults(name, genres, spotify_link, followers, image_url);
  } else if (this.status == 401) {
    console.log(this.message);
    handleAuthTokenExipry();
  }
}

function handleAuthTokenExipry() {
  let body = 'grant_type=refresh_token';
  body += '&refresh_token=' + refreshToken;
  requestAccessRefreshTokens(body);
}


function clearSearchResults() {
  document.getElementById('artist-name').innerHTML = '';
  document.getElementById('artist-genres').innerHTML = 'Genres: ';
  document.getElementById('artist-follower-count').innerHTML = 'Followers: ';
  document.getElementById('artist-spotify-link').innerHTML = 'Click to open on spotify here!';
}

function revealResults(n, g, s_link, f, i_url) {
  clearSearchResults();
  document.querySelector('.results-container').style.display = 'block';
  document.getElementById('search-result-image').style.cssText += `background-image:url(${i_url})`;
  document.getElementById('artist-name').insertAdjacentHTML('beforeend', n);
  document.getElementById('artist-follower-count').insertAdjacentText('beforeend', f.toLocaleString());
  document.getElementById('artist-spotify-link').href = s_link;
  for (let i = 0; i < 3; i++) {
    document.getElementById('artist-genres').insertAdjacentText('beforeend', `${g[i]}, `);
  }
}




/* URL which is built in requestAuthorization()
https://accounts.spotify.com/en/authorize?
client_id=3f15114ecf52461a95ef44a6b24976d7
&response_type=code
&redirect_uri=http://127.0.0.1:8000/index.html
&show_dialog=true
&scope=user-read-playback-state%20playlist-read-private%20user-follow-read%20user-read-currently-playing%20user-read-email%20user-top-read%20user-library-read */

/* URL which is loaded when you are returned back to the
http://127.0.0.1:8000/index.html?
code=AQBlhQjOYqw4u3BEovEmGGV8TULdaI62cVzkVv88NvD2qUkHiJlowDiAyEsDAs0cyhg44_
rRNeMCSUBT1TTGTElbfPtA7hSQPnoqTJFqT5v9w-PKfzM4mEofV-YAKHdnmblfB3LRlMtX6FKPlU9F16s6smz5rkLJOYkW0dfTTPxmHXhXAknDpBZ2sYHP-pF_B5gbxmIBVEG3QF9HNb_
pCPFHrsALRUbNXm7wxjbkpANDI6v1GBbevgCnB66OCY2kCrCueChxVBkdRdn41H8p_
aDZ0cjb1BLOa9NksB04U912v0oR1C1EHA_
DGcRHnqnmf4G-rZlgOb744gV_
x7jbDbwt0z_
2lDF6zsx1aDBIxo3VS3A7gN3Y */
