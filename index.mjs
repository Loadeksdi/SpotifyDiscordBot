import Discord from 'discord.js';
import getUrls from 'get-urls';
import validUrl from 'valid-url';
import SpotifyWebApi from 'spotify-web-api-node';
import ogs from 'open-graph-scraper';
import fetch from 'node-fetch';
import schedule from 'node-schedule';
import fs from 'fs';
const client = new Discord.Client();

let ACCESS_TOKEN;
let users = [];
let weeklyPlaylist = [];
const reactionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'https://example.com/callback'
});

class User {

    constructor(id) {
        this.id = id;
        this.counter = 0;
        users.push(this);
        write(users, 'users');
    }
}

class Playlist {

    constructor(id, url) {
        this.id = id;
        this.date = Date.now();
        this.tracks = [];
        this.url = url;
        weeklyPlaylist.push(this);
        write(weeklyPlaylist, 'playlist');
    }
}

function write(data, name) {
    fs.writeFile(`${name}.json`, JSON.stringify(data, null, 4), (err) => {
        if (err) {
            return;
        }
        console.log("JSON data saved.");
    });
}

function read(name) {
    fs.readFile(`${name}.json`, 'utf-8', (err, data) => {
        if (err) {
            return;
        }
        const array = JSON.parse(data.toString());
        if (!array) {
            return;
        }
        if (name === 'users')
            array.forEach(user => {
                const fileUser = new User(user.id);
                fileUser.counter = user.counter;
            });
        else {
            let filePlaylist;
            array.forEach(playlist => {
                filePlaylist = new Playlist(playlist.id);
                filePlaylist.date = playlist.date;
                filePlaylist.tracks = playlist.tracks;
                filePlaylist.url = playlist.url;
            });
            schedule.scheduleJob(new Date(filePlaylist.date + parseInt(7)), weeklyReset);
        }
        console.log(array);
    });
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
        const max = tracks.items.length < 5 ? tracks.items.length : 5;
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

function helpEmbed() {
    const embed = new Discord.MessageEmbed().setAuthor('Dispotify', 'https://cdn.iconscout.com/icon/free/png-256/spotify-11-432546.png', 'https://github.com/Loadeksdi/SpotifyDiscordBot').setColor('#18d860').setDescription('I\'m a Discord bot that reads all messages on this channel and search on Spotify a corresponding track. I support the following platforms:');
    embed.setThumbnail('./images/dispotify.png');
    embed.setTitle(`Hello, I\'m Dispotify`);
    embed.addField('Spotify', 'That seems kinda logical');
    embed.addField('YouTube', 'Let\'s not forget 99% of links');
    embed.addField('Deezer', 'Why not ?');
    embed.addField('Soundcloud', 'For the 2017 rappers');
    embed.addField('~Apple Music', 'At least I try');
    embed.setFooter('You can find my repository on Github by clicking on the Dispotify title');
    return embed;
}

client.once('ready', () => {
    console.log('Ready!');
    if (fs.existsSync("./users.json")) {
        read('users');
        read('playlist');
    } else {
        const channel = client.channels.cache.find(channel => channel.id === process.env.CHANNEL_ID);
        channel.send(helpEmbed()).then((msg) => msg.pin());
    }
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

async function weeklyReset() {
    users = [];
    const tracks = weeklyPlaylist[0].tracks;
    const playlistId = weeklyPlaylist[0].id;
    spotifyApi.removeTracksFromPlaylist(playlistId, tracks);
    spotifyApi.unfollowPlaylist(playlistId);
    weeklyPlaylist = [];
    write(users, 'users');
    write(weeklyPlaylist, 'playlist');
}

async function addTrackToPlaylist(trackid, message) {
    if (weeklyPlaylist.length === 0) {
        const newPlaylist = await spotifyApi.createPlaylist(`${message.guild.name}'s weekly playlist`, { 'description': `An auto-generated playlist made for ${message.guild.name}'s Discord server from ${new Date(Date.now()).toLocaleString('en-US')} to ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString('en-US')}.`, 'public': true });
        const playlistObject = new Playlist(newPlaylist.body.id, newPlaylist.body.external_urls.spotify);
        const imageBuffer = await (await fetch(message.guild.iconURL({ format: 'jpeg' }))).buffer();
        const base64 = imageBuffer.toString('base64');
        await spotifyApi.uploadCustomPlaylistCoverImage(newPlaylist.body.id, base64);
        schedule.scheduleJob(new Date(playlistObject.date + parseInt(7)), weeklyReset);
    }
    const currentPlaylist = weeklyPlaylist[0];
    let inPlaylist = false;
    currentPlaylist.tracks.forEach(track => {
        if (track.uri === `spotify:track:${trackid}`) {
            inPlaylist = true;
        }
    });
    if (inPlaylist) {
        message.channel.send(`Sorry, <@${message.author.id}> this track is already in the playlist!`);
        return;
    }
    await spotifyApi.addTracksToPlaylist(currentPlaylist.id, [`spotify:track:${trackid}`]);
    currentPlaylist.tracks.push({ uri: `spotify:track:${trackid}` });
    await message.channel.send(`Thanks to <@${message.author.id}>, the track has been added to the weekly playlist: <${currentPlaylist.url}>`);
    write(weeklyPlaylist, 'playlist');
}

async function preCollectionActions(message, searchResult, embedMessage) {
    const filter = (reaction, user) => {
        return reactionEmojis.includes(reaction.emoji.name) && user.id === message.author.id;
    };

    const tracks = searchResult.body.tracks;
    const max = tracks.items.length < 5 ? tracks.items.length : 5;
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
        write(users, 'users');
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
