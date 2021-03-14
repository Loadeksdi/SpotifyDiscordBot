const Discord = require('discord.js');
const client = new Discord.Client();
const getUrls = require('get-urls');
const SpotifyWebApi = require('spotify-web-api-js');
const spotifyApi = new SpotifyWebApi();
const fetch = require('node-fetch');

spotifyApi.setAccessToken(process.env.SPOTIFY_TOKEN);

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

async function checkExistingTrack(url) {
    let trackname = "";
    if (url.includes('youtube')) {
        url = `https://www.youtube.com/oembed?format=json&url=${url}`;
        trackname = await fetch(url).then(res => res.json()).then(json => { return json.title });
        console.log(trackname);
    }
    if (url.includes('spotify')) {
        const body = await fetch(url).then(res => res.text()).then(body => { return body });
        xmlDoc = parser.parseFromString(body, "text/xml");
        trackname = xmlDoc.getElementsByTagName('title');
        console.log(trackname);
    }
    if (url.includes('soundcloud')) {
        url = `https://soundcloud.com/oembed?url=${url}&format=json`;
        trackname = await fetch(url).then(res => res.json()).then(json => { return json.title });
        console.log(trackname);
    }
    if (url.includes('deezer')) {
        console.log(response.json());
    }
    if (url.includes('apple')) {
        console.log(response.json());
    }
    return null;
}

client.on('message', message => {
    if (message.channel.id !== process.env.CHANNEL_ID) {
        return;
    }
    if (new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(message.content)) {
        const urls = getUrls(message.content);
        urls.forEach(checkExistingTrack);
    }
});

client.login(process.env.BOT_TOKEN);
