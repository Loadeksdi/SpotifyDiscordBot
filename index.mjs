import Discord from 'discord.js';
import getUrls from 'get-urls';
import validUrl from 'valid-url';
import SpotifyWebApi from 'spotify-web-api-node';
import ogs from 'open-graph-scraper';
import fetch from 'node-fetch';
import { imageToBase64 } from '@legend80s/image-to-base64';
const client = new Discord.Client();

let ACCESS_TOKEN;
const reactionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const users = [];

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'https://example.com/callback'
});

class User {

    constructor(id) {
        this.id = id;
        this.tracks = [];
        this.counter = 0;
        users.push(this);
    }
}

function getUserById(id) {
    return users.find(user => user.id === id);
}

function searchEmbed(tracks, title) {
    const embed = new Discord.MessageEmbed().setAuthor('Dispotify', 'https://cdn.iconscout.com/icon/free/png-256/spotify-11-432546.png', 'https://github.com/Loadeksdi/SpotifyDiscordBot').setColor('#18d860').setDescription('Results on Spotify for this track are : ');
    embed.setTitle(title);
    if (tracks.items.length === 0) {
        embed.addField('Error', 'No tracks have been found');
        return embed;
    }
    else {
        const max = tracks.items.size < 5 ? tracks.items.size : 5;
        for (let i = 0; i < max; i++) {
            let artistsName = '';
            tracks.items[i].artists.forEach(artist => {
                artistsName += artist.name + ' ';
            });
            embed.addField(i + 1, `${artistsName} - ${tracks.items[i].name}`);
        }
        embed.setFooter('Click on the reaction to add the track to the weekly playlist !');
    }
    return embed;
}

client.once('ready', () => {
    console.log('Ready!');
});

async function searchForTrack(track) {
    return await spotifyApi.searchTracks(track);
}

async function checkExistingTrack(url) {
    const options = { url };
    if (validUrl.isUri(url)) {
        return await ogs(options);
    }
}

async function addTrackToPlaylist(trackid, message) {
    const searchPlaylist = await spotifyApi.searchPlaylists(`${message.guild.name}'s weekly playlist`);
    let searchPlaylistBody = searchPlaylist.body;
    let playlist = searchPlaylistBody.playlists.items[0];
    if (searchPlaylistBody.playlists.items.size === undefined) {
        playlist = await spotifyApi.createPlaylist(`${message.guild.name}'s weekly playlist `, { 'description': `An auto-generated playlist made for ${message.guild.name}'s Discord server from ${new Date(Date.now()).toLocaleString('en-US')} to ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString('en-US')}.`, 'public': true });
        let image = (await imageToBase64(message.guild.iconURL({ format: 'jpeg' })));
        image = image.replace('data:image/jpeg;base64,', '');
        await spotifyApi.uploadCustomPlaylistCoverImage(playlist.body.id, image);
    }
    await spotifyApi.addTracksToPlaylist(playlist.body.id, [`spotify:track:${trackid}`]);
    await message.channel.send(`Thanks to ${message.author.username}, the track has been added to the weekly playlist: ${playlist.body.external_urls.spotify}`);
}

async function preCollectionActions(message, searchResult, embedMessage) {
    const filter = (reaction, user) => {
        return reactionEmojis.includes(reaction.emoji.name) && user.id === message.author.id;
    };

    const tracks = searchResult.body.tracks;
    const max = tracks.items.size < 5 ? tracks.items.size : 5;
    for (let i = 0; i < max; i++) {
        await embedMessage.react(reactionEmojis[i]);
    }
    const collector = embedMessage.createReactionCollector(filter, { max: 1, time: 60000 });

    async function postCollectionActions(index, user) {
        await embedMessage.reactions.removeAll();
        const trackid = tracks.items[index].id;
        let currentUser = getUserById(user.id);
        if (!currentUser) {
            currentUser = new User(user.id);
        }
        currentUser.counter++;
        currentUser.tracks.push(trackid);
        await addTrackToPlaylist(trackid, message);
    };

    collector.on('collect', (reaction, user) => {
        const index = reactionEmojis.findIndex(emoji => emoji === reaction.emoji.name);
        postCollectionActions(index, user);
    });
}

client.on('message', async (message) => {
    if ((message.channel.id !== process.env.CHANNEL_ID) || message.author.bot) {
        return;
    }
    const user = getUserById(message.author.id);
    if (!user || user.counter < 5) {
        const urls = getUrls(message.content);
        let embedMessage;
        let searchResult;
        if (urls.size === 0) {
            searchResult = await searchForTrack(message.content);
            embedMessage = await message.channel.send(searchEmbed(searchResult.body.tracks, message.content));
            preCollectionActions(message, searchResult, embedMessage);
        }
        else if (urls.size === 1) {
            const trackNames = await Promise.all([...urls].map(url => checkExistingTrack(url)));
            for (const track of trackNames) {
                searchResult = await searchForTrack(track.result.ogTitle);
                embedMessage = await message.channel.send(searchEmbed(searchResult.body.tracks, track.result.ogTitle));
            };
            preCollectionActions(message, searchResult, embedMessage);
        }
        else {
            message.channel.send(`Sorry <@${message.author.id}>, you exceeded your weekly quota of 5 tracks per week !`);
            return;
        }
    }
});

async function refreshAccessToken() {
    const credentials = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    const res = await fetch(`https://accounts.spotify.com/api/token?grant_type=refresh_token&refresh_token=${process.env.REFRESH_TOKEN}`, {
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${encodedCredentials}` }
    });
    const resBody = await res.json();
    ACCESS_TOKEN = resBody.access_token;
}

await refreshAccessToken();
spotifyApi.setAccessToken(ACCESS_TOKEN);
client.login(process.env.BOT_TOKEN);
