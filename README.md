# SpotifyDiscordBot
A discord bot that automatically adds songs into a shared playlist for members of a server.

# Why ?
The reason I started developing this bot was to share music with my whole Discord server and give the experience to members to share their music taste with each other. People have the opportunity to discover new genres and share their favourites artists together. (It ended up pretty badly when some decided to add some cursed death metal to the playlist.) I think it's a useful tool for little communities to enjoy music. The fact that it is reset every week is pushing people to interact and discover new stuff.
# How does that bot work ?
This bot is listening to all messages on a specific channel defined by its id. 

If the message contains **exactly** one link, it will look for this specific link and use related open-graph data (title, artist) to make a request to the Spotify API (fully compatible w/ Spotify, YouTube, Soundcloud & Deezer). 

If the message contains no link, it will just call the Spotify API with the message content. 

Once data has been retrieved, the user can choose between the 5 first results returned by Spotify. Then the track is added to the playlist, which is created if non-existing yet, so people can listen to a variety of music.

# Restrictions
- A user can only add 5 tracks per week to the community playlist.
- A track can only be added once per weekly playlist.
- The playlist resets a week after being created.
