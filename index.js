const Discord = require('discord.js');
const client = new Discord.Client();
const getUrls = require('get-urls');
const SpotifyWebApi = require('spotify-web-api-js');
const spotifyApi = new SpotifyWebApi();
const fetch = require('node-fetch');

spotifyApi.setAccessToken('21a89f53cb3a4d1cb55f42bd996588dd');

client.once('ready', () => {
    console.log('Ready!');
});

function searchForTrack(track) {
    spotifyApi.searchTracks(track).then(
        function (data) {
            console.log('Track information', data);
        },
        function (err) {
            console.error(err);
        }
    );
}

function checkExistingTrack(url) {
    console.log(url);
    fetch(url)
        .then(res => res.json())
        .then(json => console.log(json));
    /**
     * if (url.includes('youtube')) {
        console.log(response.json());
    }
    if (url.includes('spotify')) {
        console.log(response.json());
    }
    if (url.includes('soundcloud')) {
        console.log(response.json());
    }
    if (url.includes('deezer')) {
        console.log(response.json());
    }
     */

    return null;
}

client.on('message', message => {
    if (message.channel.id !== "763079789803470858") {
        return;
    }
    if (new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(message.content)) {
        const urls = getUrls(message.content);
        urls.forEach(checkExistingTrack);
    }
});

client.login('ODIwNDYwNjUwODY5ODE3MzU0.YE1fhg.H4DlubVU3MrZ1VhOhvYM72TMh-g');
