//Dependencies
var Discord = require("discord.js");
var EventEmitter = require("events");
var leftPad = require("left-pad");

//Variables
var bot = new Discord.Client();
var instance_id = 0;
class myEmitter extends EventEmitter{}
var logger = new myEmitter();

//Config
const whitelist = [
	"1234567890",
	"691337420",
	"6969696969"
];
const channel_category = "468328663797071872";

//TODO: DEBG
//TODO: emit warn and error events
//TODO: logging to file

bot.on("message", (message) => {
	if(!message.content.startsWith("/create")){ //check if message starts with "/create"
		return;
	}
	instance_id += 1;
	var instance = instance_id;
	logger.emit("debug", `CREATE/01/${leftPad(instance,4,"0")}/DBG - "/create" prompt detected`);
	if(!message.member){ //check if message was sent from a Discord guild
		return logger.emit("debug", `CREATE/02/${leftPad(instance,4,"0")}/DBG - FAIL! Command issued in DM. Stopping here.`);
	}
	logger.emit("debug", `CREATE/02/${leftPad(instance,4,"0")}/DBG - PASS! Command issued on guild.`);
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
			/* REMOVE THIS LINE
			,
			{	//hide from "Pending"
				type: "role",
				id: "342560476275933184",
				deny: 1024
			}//*/
		],
		(`Created by ${message.member.displayName} via /create command`)
	)
		.catch((error) =>{
			logger.emit("debug", `CREATE/03/${leftPad(instance,4,"0")}/ERR - ERROR! Could not create new channel or lacking certain permissions`);
			logger.emit("error", error);
		})
		.then(channel=>{
			logger.emit("debug", `CREATE/03/${leftPad(instance,4,"0")}/DBG - PASS! VoiceChannel "${channel.name}" created`);
			deleteEmptyChannelAfterDelay(channel); //EXPERIMENTAL AND DISABLED FOR NOW, could cause issues
			channel.setParent(channel_category)
				.then(()=>{})
				.catch((error) =>{
					logger.emit("debug", `CREATE/04/${leftPad(instance,4,"0")}/ERR - ERROR! Could not change parent of channel`);
					logger.emit("error", error);
				})
				.finally(function(){	//move channel in voice category
					logger.emit("debug", `CREATE/04/${leftPad(instance,4,"0")}/DBG - PASS! Changed parent of new channel`);
					channel.setPosition(message.guild.channels.get(channel_category).children.size - 3)
						.catch((error) =>{
							logger.emit("debug", `CREATE/05/${leftPad(instance,4,"0")}/ERR - ERROR! Could not move channel`);
							logger.emit("error", error);
						})
						.finally(function(){ //move channel to correct position
							logger.emit("debug", `CREATE/05/${leftPad(instance,4,"0")}/DBG - PASS! Moved channel to a different position`);
							channel.permissionOverwrites.get(message.guild.defaultRole.id).delete()
								.catch((error) =>{
									logger.emit("debug", `CREATE/06/${leftPad(instance,4,"0")}/ERR - ERROR! Could not delete overwrites for role "${message.guild.defaultRole.name}"`);
									logger.emit("error", error);
								})
								.then(function(){ //delete overwrite for @everyone (make channel visible again)
									logger.emit("debug", `CREATE/06/${leftPad(instance,4,"0")}/DBG - PASS! Deleted overwrites for role "${message.guild.defaultRole.name}"`);
									channel.createInvite()
										.catch((error) =>{
											logger.emit("debug", `CREATE/07/${leftPad(instance,4,"0")}/DBG - ERROR! Invite not created`);
											logger.emit("error", error);
										})
										.then((invite) => {
											logger.emit("debug", `CREATE/07/${leftPad(instance,4,"0")}/DBG - PASS! Invite created`);
											bot.channels.get("321449537413578752").send(`Created ${channel.name} for ${message.member} - ${invite} <- join link to go into the VC`);
										});
								});
						});
				});
		});

});

bot.on("voiceStateUpdate", (oldMember, newMember) => {
	deleteEmptyChannelAfterDelay(oldMember.voiceChannel);
});

function deleteEmptyChannelAfterDelay(voiceChannel, delayMS = 12000){
	instance_id += 1;
	var instance = instance_id;
	if(!voiceChannel){
		/**
		 * This means member was previously not connected to a voice channel. As a result this also means that there's no channel that could be
		 * left empty by said member now.
		 */
		return logger.emit("debug", `DELETE/01/${leftPad(instance,4,"0")}/DBG - FAIL! Previous voice channel does not exist. Stopping here.`);
	}
	logger.emit("debug", `DELETE/01/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} exists`);
	for(var channel of whitelist){
		if(voiceChannel.id == channel) return logger.emit("debug", `DELETE/02/${leftPad(instance,4,"0")}/DBG - FAIL! Voice channel ${voiceChannel.name} is whitelisted`);
	}
	logger.emit("debug", `DELETE/02/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} not whitelisted`);
	if(voiceChannel.members.first()){
		/**
		 * Check if there's any people still left in the voice chat that just got left by this one member. If there's at least a single person
		 * in there, we don't have to do any deletions here.
		 */
		return logger.emit("debug", `DELETE/03/${leftPad(instance,4,"0")}/DBG - FAIL! Voice channel ${voiceChannel.name} is not empty`);
	}
	logger.emit("debug", `DELETE/03/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} is empty`);
	/**
	 * I kinda have to do an explanation here, otherwise I will wonder WTF this algorithm is supposed to do in less than an hour.
	 * So basically I tell the code to delete the channel 2 minutes after the last person leaves. Nice, right? Except...
	 * Imagine Joe. He sees the empty channel and is like "oh neat, don't have to create a new one" and just connects there.
	 * After just a minute he leaves the channel to tell his buddies to come aswell. This takes less than 10s, but the channel is already gone.
	 * The reason is simple: the initial timer for deleting the channel was NOT stopped. Joe connected and disconnected within these two minutes.
	 * 
	 * Anyway, my solution is quite simple: give the channel "health points". Each time someone leaves the channel, it gets 1 health.
	 * After 120s of the last person leaving the channel loses 1 health. If the channel has 0 health it gets deleted.
	 */
	if(!voiceChannel.health){
		voiceChannel.health = 0;
	}
	voiceChannel.health += 1;
	logger.emit("debug", `DELETE/04/${leftPad(instance,4,"0")}/DBG - Health of voice channel ${voiceChannel.name} is ${voiceChannel.health}. Queued for deletion in ${Math.floor(delayMS/1000)}s.`);
	setTimeout(function(){	//queue channel for deletion and wait
		if(!voiceChannel){
			/**
			 * Check wether or not the voice channel has already been deleted (e.g. by a previous instance of the timer)
			 * If the channel is already gone, there's no point in going any further.
			 */
			return logger.emit("debug", `DELETE/05/${leftPad(instance,4,"0")}/DBG - FAIL! Voice channel ${voiceChannel.name} doesn't exist anymore`);
		}
		logger.emit("debug", `DELETE/05/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} still exists`);
		if(voiceChannel.members.first()){
			/**
			 * Check to see if there's still people in there.
			 */
			return logger.emit("debug", `DELETE/06/${leftPad(instance,4,"0")}/DBG - FAIL! Voice channel ${voiceChannel.name} is not empty`);
		}
		logger.emit("debug", `DELETE/06/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} is empty`);
		voiceChannel.health -= 1;
		if(voiceChannel.health > 0){
			/**
			 * Check for health.
			 */
			return logger.emit("debug", `DELETE/07/${leftPad(instance,4,"0")}/DBG - FAIL! Voice channel ${voiceChannel.name} still has ${voiceChannel.health} health`);
		}
		logger.emit("debug", `DELETE/07/${leftPad(instance,4,"0")}/DBG - PASS! Voice channel ${voiceChannel.name} has ${voiceChannel.health} health. Attempting to delete.`);
		voiceChannel.delete()	//delete channel
			.then(channel => {
				logger.emit("debug", `DELETE/08/${leftPad(instance,4,"0")}/DBG - PASS! Deleted channel ${channel.name}`);
			})
			.catch(error => {
				logger.emit("debug", `DELETE/08/${leftPad(instance,4,"0")}/DBG - ERROR! Could not delete channel ${channel.name}`);
				logger.emit("error", error);
			});
	}, delayMS);
}

//Status logging
logger
	.on("debug", (message)=>{
		console.log(message);
	})
	.on("error", (message)=>{
		console.error(message);
	});

bot.login(require("./../nova-cores/token.json").kanna);
