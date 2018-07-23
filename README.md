# CreateVoice
A discord.js bot for creating custom voice channels.
## Features
1. Creates a new voice channel on command (default: `/create`)
1. User gets perms for their channel
1. Channel automatically gets deleted after being empty for too long
1. Channel spawns in set category
## Setup
The bot is exclusively configured through .json files.
### Token
Provide your token to the token.json file.
### Configuration
The bot offers unique settings for each guild. Settings are provided as an object in an array:
```javascript
{
  "guild": "446409003136712726",
  "category": "",
  "position": 3,
  "ttl": 120
}
```
**Guild**: ID of the guild  
**Category**: ID of the category (parent) the channels will be put in
**Position**: The spawn position of the new channel (counted from below)
**TTL**: Time to live before the channel gets deleted
