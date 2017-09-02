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
* !bf4stats **_username_**: Returns **_username_**'s rank, k/d and full stats link
* !commands: Returns a link to the user added commands for the channel
  * !command: Alias for !commands
  * !commands add **_!command_** **_command text_**: Adds **_!command_** to the channel
  * !commands addalias **_!newcommand_** **_!commandtoalias_**: Adds **_!newcommand_** as an alias for **_!commandtoalias_**
  * !commands edit **_!command_** **_command text_**: Edits **_!command_**
  * !commands permissions **_!command_** **_(0-4)_**: Sets the needed permission level for the given **_!command_**
    * Everyone (0)
    * Regulars (1)
    * Subs (2)
    * Mods (3)
    * Channel Owner (4)
  * !commands delete **_!command_**: Removes **_!command_**
* !currentsong: Returns the currently playing song
  * !cs: Alias for !currentsong
  * !song: Alias for !currentsong
* !firstseen **_username_**: Returns when **_username_** was first seen in the channel
* !followage **_username_**: Returns how long **_username_** has been following the channel
* !game: Returns the game currently being played on the channel
* !lastseen **_username_**: Returns when **_username_** was first seen in the channel
* !pause: Pauses the music
* !play: Plays the music
* !playlistrequest **_playlist_**: Allows users to request x amount of songs from a YouTube playlist.
  * !pr: Alias for !playlistrequest
* !promote **_queue position_**: Promotes **_queue position_** to be the next song played.
* !regulars: Used to add and remove regulars from the channel
  * !regular: Alias for !regulars
  * !regulars add **_username_**: Add **_username_** as a regular for the channel
  * !regulars delete **_username_**: Deletes **_username_** as a regular for the channel
* !removesongs **_queue position/username_**: Removes song by queue position or all songs by **_username_**.
  * !removesong: Alias for !removesongs
* !shuffle: Shuffles all songs in the song queue
* !skipsong: Skips the currently playing song
* !songcache: Keeps a record of all songs that have been requested, and doesn't allow the same songs to be repeated within x time frame.
  * !cache: Alias for !songcache
* !songlist: Returns the list of songs in the queue
  * !sl: Alias for !songslist
  * !songs: Alias for !songslist
* !songrequest **_song_**: Adds the song to the song list. Can be a URL, videoID, or song title.
  * !sr: Alias for !songrequest
* !uptime: Returns the uptime
* !viewers: Returns the current number of viewers
* !volume: Returns the volume for the currently playing song
* !winner: Returns a random user from the viewer list as a 'winner'
* !wrongsong: Removes the last song requested by the user calling the command.