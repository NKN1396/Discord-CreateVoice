//Dependencies
var Discord = require("discord.js");

//Variables
var bot = new Discord.Client();

//Config
const config = require("./config.json");

bot.on("message", (message) => {
	//check if message starts with "/create"
	if(!message.content.startsWith("/create")) return;
	if(!message.member) return;
	var test;
	for(var bundle of config){
		if(bundle.guild == message.guild.id) {
			test = bundle;
			break;
		}
	}

	message.guild.createChannel(
		`Talk ${message.member.displayName}`,
		"voice",
		[
			{	//make creator of channel owner (aka gib perms)
				type: "member",
				id: message.member.id,
				allow: 17825808
			},
			{	//hide for everyone temporarily so the channel list doesn't fucking earthquake like a diabetic after downing 3 monsters - this is a permament temporary workaround until D.JS v12 gets released
				type: "role",
				id: message.guild.defaultRole,
				deny: 1024
			}
		],
		(`Created by ${message.member.displayName} via /create command`)
	)
		.catch(error => console.log(error))
		.then(channel=>{
			deleteEmptyChannelAfterDelay(channel);
			channel.setParent(config[0].category)
				.catch(error => console.log(error))
				.finally(function(){	//move channel in voice category
					channel.setPosition(message.guild.channels.get(config[0].category).children.size - config[0].position)
						.catch(error => console.log(error))
						.finally(function(){ //move channel to correct position
							channel.permissionOverwrites.get(message.guild.defaultRole.id).delete()
								.catch(error => console.log(error))
								.then(function(){ //delete overwrite for @everyone (make channel visible again)
									channel.createInvite()
										.catch(error => console.log(error))
										.then((invite) => {
											bot.channels.get("321449537413578752").send(`Created ${channel.name} for ${message.member} - ${invite} <- join link to go into the VC`);
										});
								});
						});
				});
		});

});

bot.on("voiceStateUpdate", oldMember => {
	deleteEmptyChannelAfterDelay(oldMember.voiceChannel);
});

function deleteEmptyChannelAfterDelay(voiceChannel, delayMS = 12000){
	if(!voiceChannel) return;
	if(voiceChannel.members.first()) return;
	if(!voiceChannel.health) voiceChannel.health = 0;
	voiceChannel.health += 1;
	setTimeout(function(){	//queue channel for deletion and wait
		if(!voiceChannel) return;
		if(voiceChannel.members.first()) return;
		voiceChannel.health -= 1;
		if(voiceChannel.health > 0) return;
		voiceChannel.delete()	//delete channel
			.catch(error => console.log(error));
	}, delayMS);
}

//bot.login(require("./token.json"));
