# SkedogBot
SkedogBot is a Twitch chat bot written in Node.js with a wide range of commands. What makes this bot special is the various song commands that are supported.

### How to Use
Just go to [skedogbot.com](http://skedogbot.com) and click login - this will ask you to login using Twitch - and then click the Join Channel button and you are good to go!

### Featured Commands
* !playlistrequest: Allows users to request x amount of songs from a YouTube playlist.
* !shuffle: Shuffles all songs in the song queue
* !songcache: Keeps a record of all songs that have been requested, and doesn't allow the same songs to be repeated within x time frame.
* !wrongsong: Removes the last song requested by the user calling the command.

### All Default Commands
* !8ball: Returns a random '8-Ball' type of message
* !bf4stats **_${username}_**: Returns **_${username}_**'s rank, k/d and full stats link
* !commands: Returns a link to the user added commands for the channel
  * !command: Alias for !commands
  * !commands add **_${command}_** **_${command text}_**: Adds **_${command}_** to the channel
  * !commands edit **_${command}_** **_${command text}_**: Edits **_${command}_**
  * !commands delete **_${command}_**: Removes **_${command}_**
* !currentsong: Returns the currently playing song
  * !cs: Alias for !currentsong
  * !song: Alias for !currentsong
* !firstseen **_${username}_**: Returns when **_${username}_** was first seen in the channel
* !followage **_${username}_**: Returns how long **_${username}_** has been following the channel
* !game: Returns the game currently being played on the channel
* !lastseen **_${username}_**: Returns when **_${username}_** was first seen in the channel
* !pause: Pauses the music
* !play: Plays the music
* !playlistrequest **_${playlist}_**: Allows users to request x amount of songs from a YouTube playlist.
  * !pr: Alias for !playlistrequest
* !promote **_${queue position}_**: Promotes **_${queue position}_** to be the next song played.
* !qotd: Returns a *funny* quote of the day
* !regulars: Used to add and remove regulars from the channel
  * !regular: Alias for !regulars
  * !regulars add **_${username}_**: Add **_${username}_** as a regular for the channel
  * !regulars delete **_${username}_**: Deletes **_${username}_** as a regular for the channel
* !removesongs **_${queue position/username}_**: Removes song by queue position or all songs by **_${username}_**.
  * !removesong: Alias for !removesongs
* !shuffle: Shuffles all songs in the song queue
* !skipsong: Skips the currently playing song
* !songcache: Keeps a record of all songs that have been requested, and doesn't allow the same songs to be repeated within x time frame.
  * !cache: Alias for !songcache
* !songlist: Returns the list of songs in the queue
  * !sl: Alias for !songslist
  * !songs: Alias for !songslist
* !songrequest **_${song}_**: Adds the song to the song list. Can be a URL, videoID, or song title.
  * !sr: Alias for !songrequest
* !uptime: Returns the uptime
* !viewers: Returns the current number of viewers
* !volume: Returns the volume for the currently playing song
* !winner: Returns a random user from the viewer list as a 'winner'
* !wrongsong: Removes the last song requested by the user calling the command.