module.exports = function(bot){
	bot.on("message", (message) => {
		if(!message.content.startsWith("/create")){ //check if message starts with "/create"
			return;
		}
		if(!message.member){ //check if message was sent from a Discord guild
			return;
		}
		message.guild.createChannel(
			//("Talk " + newMember.displayName)
			"Talk " + message.member.displayName,
			"voice",
			[
				{	//make first member in channel admin
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
			.then(channel=>{
				//deleteEmptyChannelAfterDelay(channel); //EXPERIMENTAL AND DISABLED FOR NOW, could cause issues
				console.log(`VOICEMAGIC 02: PASS - VoiceChannel "${channel.name}" created`);
				channel.setParent(channel_category_voice).then(function(){	//move channel in voice category
					console.log("VOICEMAGIC 03: PASS - Changed parent of channel");
					channel.setPosition(newMember.guild.channels.get(channel_category_voice).children.size - 3).then(function(){ //move channel to correct position
						console.log("VOICEMAGIC 04: PASS - Moved channel");
						channel.permissionOverwrites.get(newMember.guild.defaultRole.id).delete().then(function(){ //delete overwrite for @everyone (make channel visible again)
							console.log(`VOICEMAGIC 05: PASS - Deleted overwrites for role "${newMember.guild.defaultRole.name}"`);
							newMember.setVoiceChannel(channel)
								.then(function(){
									console.log(`VOICEMAGIC 06: PASS - Moved ${newMember.displayName} into channel`);
								})
								.catch(function(){
									console.error(`VOICEMAGIC 06: FAIL - Could not move ${newMember.displayName} into channel`);
								});
						}).catch(function(){
							console.error(`VOICEMAGIC 05: PASS - Could not delete overwrites for role "${newMember.guild.defaultRole.name}"`);
						});
					})
						.catch(function(){
							console.error("VOICEMAGIC 04: FAIL - Could not move channel");
						});
				})
					.catch(function(){
						console.error("VOICEMAGIC 03: FAIL - Could not change parent of channel");
					});
			})
			.catch(function(){
				console.error("VOICEMAGIC 02: FAIL - Could not create new channel or lacking certain permissions");
			});

	});
	
	bot.on("voiceStateUpdate", (oldMember, newMember) => {
		deleteEmptyChannelAfterDelay(oldMember.voiceChannel);
	});
}

function deleteEmptyChannelAfterDelay(voiceChannel, delayMS = 120000){
	if(!voiceChannel){
		/**
		 * This means member was previously not connected to a voice channel. As a result this also means that there's no channel that could be
		 * left empty by said member now.
		 */
		return;
	}
	if(voiceChannel.members.first()){
		/**
		 * Check if there's any people still left in the voice chat that just got left by this one member. If there's at least a single person
		 * in there, we don't have to do any deletions here.
		 */
		return;
	}
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
	console.log(`VOICEMAGIC 08: DEBG - Queued channel ${voiceChannel.name} for deletion in 120s`);
	if(!voiceChannel.health){
		voiceChannel.health = 0;
	}
	voiceChannel.health += 1;
	setTimeout(function(){	//queue channel for deletion and wait
		if(!voiceChannel){
			/**
			 * Check wether or not the voice channel has already been deleted (e.g. by a previous instance of the timer)
			 * If the channel is already gone, there's no point in going any further.
			 */
			return console.log(`VOICEMAGIC 09: DEBG - Channel ${voiceChannel.name} doesn't exist anymore`);
		}
		console.log(`VOICEMAGIC 09: DEBG - Channel ${voiceChannel.name} still exists`);
		if(voiceChannel.members.first()){
			/**
			 * Check to see if there's still people in there.
			 */
			return console.log(`VOICEMAGIC 10: DEBG - Channel ${voiceChannel.name} is not empty`);
		}
		console.log(`VOICEMAGIC 10: DEBG - Channel ${voiceChannel.name} is empty, attempting to delete`);
		voiceChannel.health -= 1;
		if(voiceChannel.health > 0){
			/**
			 * Check for health.
			 */
			return;
		}
		voiceChannel.delete()	//delete channel
			.then(channel => {
				console.log(`VOICEMAGIC 11: PASS - Deleted channel ${channel.name}`);
			})
			.catch(channel => {
				console.error(`VOICEMAGIC 11: PASS - Could not delete channel ${channel.name}`);
			});
	}, delayMS);
}