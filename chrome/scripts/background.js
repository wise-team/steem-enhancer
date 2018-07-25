var settingsShowImages = true;
var settingsNewEntriesNotification = true;
const tagEntriesQuantity = 10;
const maxTagSearchingDept = 5;
var maxRichNotifications = 5;

var pendingNotifications = [];
var entriesNotificationList = [];

var audio = new Audio('../sounds/all-eyes-on-me.ogg');

function setEntryClicked(id) {
	for (let index = 0; index < entriesNotificationList.length; index++) {
		const element = entriesNotificationList[index];
		if(element.id == id) {
			entriesNotificationList[index].clicked = true;
			saveNotificationList(entriesNotificationList, function () {
				badgeShowNotificationQuantity(getUnvievedNotificationsCount(entriesNotificationList));
			});
		}
	}
}

var followedTagsArray = [];
var processingTags = null;

function initialize() {

	steem.api.setOptions({ url: 'https://api.steemit.com' });

	if(settings.isInitialized) {
		chrome.runtime.openOptionsPage();
	}
	settingsReadSettings(function (results) {
		settings = results.settings;
		settingsReadTags(function (tags) {
			followedTagsArray = tags;
			console.log("schedule parseFollowing tag from initialization: " + Date());
			clearTimeout(processingTags);
			processingTags = setTimeout(parseFollowedTags, 30000);			
		});
	});
}

function getUserFeed(callback) {

	if(settingsIsUsernameEntered() && settings.showNotificationsFromFeed) {

		steem.api.getDiscussionsByFeed({
			tag: settings.username,
			limit: 10
		}, function (err, result) {
			console.log("Checked user feed");

			if (err) {
				console.log(err);
				if (callback) {
					callback();
				}
			} else {
				var counter = 0;
				result.forEach(item => {

					if (settings.richNotificationsEnabled && settings.showNotificationsFromFeed) {
						prepareNotification(item, '@' + item.author, null);
					}

					counter++;

					if (counter >= result.length) {
						if (callback) {
							callback();
						}
					}
				})
			}
		});

	} else {
		if(callback) {
			callback();
		}
	}
 
}

function prepareNotification(item, tag, conditionalTag) {
	var shouldParseEntry = false;
	
	var metadata = JSON.parse(item.json_metadata);

	if (conditionalTag) {
		for (let index = 0; index < metadata.tags.length; index++) {
			const element = metadata.tags[index];

			if (element == conditionalTag) {
				shouldParseEntry = true;
				break;
			}
		}
	} else {
		shouldParseEntry = true;
	}
	
	if(shouldParseEntry) {
		if (!entryAlreadyProcessed(item.id, entriesNotificationList)) {

			var alreadyViewed = false; 
			
			if (!entryAlreadyProcessed(item.id, pendingNotifications)) {
				var bodyWithoutHTMLTags = item.body.replace(/(<([^>]+)>)/ig, "");
				bodyWithoutHTMLTags = stripMarkdown(bodyWithoutHTMLTags);

				if (settings.richNotificationsEnabled) {
					var imageUrl = "";
	
					if (metadata.image) {
						imageUrl = metadata.image[0];
					}
	
					if(item.author != settings.username) {
						console.log("Preparing notification: " + item.id + ", " + item.title);
						var link = "";
						if(item.replyLink) {
							link = item.replyLink;
						} else {
							link = "https://steemit.com/@" + item.author + "/" + item.permlink;
						}
						pendingNotifications.push({
							id: item.id,
							title: item.title,
							body: bodyWithoutHTMLTags,
							image: imageUrl,
							link: link
						});
					} else {
						alreadyViewed = true; // do not show your own posts on new entries list
					}
				}
			}
			var tagsString = tag;
			if (conditionalTag) {
				tagsString = tag + " #" + conditionalTag;
			}
			entriesNotificationList.push({ id: item.id, title: item.title, tags: tagsString, link: link, clicked: alreadyViewed, timestamp: Date() });
		}
	}
}

function showRichNotification(entry) {

	var options = {
		icon: "../icons/48.png",
		body: entry.body
	}

	if (settings.showImagesInNotifications) {
		options.image = entry.image;
	}

	var notification = new Notification(entry.title, options);

	notification.onclick = function () {
		setEntryClicked(entry.id);
		window.focus();
		chrome.tabs.create({
			url: entry.link
		});
		notification.close();
	};
}

function parseFollowedTags() {
	settingsReadTags(function (tags) {
		followedTagsArray = tags;

		chrome.storage.local.get({ entriesNotificationList: [] }, function (result) {
			entriesNotificationList = result.entriesNotificationList;

			var tagIndex = 0;
			var tag = "";
			var secondTag = "";

			(function parseTagRecursively() {
				var tag = followedTagsArray[tagIndex];
				var secondTag = "";
				if(tag.indexOf(" ") > -1) {
					secondTag = tag.split(" ")[1];
					tag = tag.split(" ")[0];
				} else {
					secondTag = "";
				}

				steem.api.getDiscussionsByCreated({
					tag: tag,
					limit: tagEntriesQuantity
				}, function (err, response) {
					if (err) {
						console.log(err);
						tagIndex++;
						if (tagIndex >= followedTagsArray.length) {
							getUserFeed(function () {
								getUserHistory(function () {
									processNotifications();
								})
							});
						} else {
							parseTagRecursively();
						}
					} else {
						console.log("Checked tag: " + tag + " " + secondTag + ", posts: " + response.length);
						var counter = 0;
						if (response.length == 0) {
							tagIndex++;
							if (tagIndex >= followedTagsArray.length) {
								getUserFeed(function () {
									getUserHistory(function () {
										processNotifications();
									})
								});
							}
							else {
								parseTagRecursively();
							}
						}
						response.forEach(item => {
							prepareNotification(item, '#' + tag, secondTag);

							counter++;

							if (counter >= response.length) {
								tagIndex++;
								if (tagIndex >= followedTagsArray.length) {
									getUserFeed(function () {
										getUserHistory(function () {
											processNotifications();
										})
									});
								}
								else {
									parseTagRecursively();
								}
							}
						})
					}
					
				});
			})()
		});
	})
}

function processNotifications() {

	if(settings.isInitialized == false) {
		pendingNotifications = [];
		settings.isInitialized = true;
	}

	if (pendingNotifications.length > maxRichNotifications) {
		soundsPlaySound(audio);
		var postsQuantity = pendingNotifications.length
		pendingNotifications = [];
		var notification = new Notification("You have many new posts", {
			icon: "../icons/48.png",
			body: "Visit steem to see " + postsQuantity + " new posts"
		});

		notification.onclick = function () {
			window.focus();
			chrome.tabs.create({
				url: "https://steemit.com"
			});
			notification.close();
		};
	}
	else {
		if(pendingNotifications.length) {
			soundsPlaySound(audio);
		}
		pendingNotifications.forEach(notification => {
			showRichNotification(notification);
			console.log("Showed notification: " + notification.title)
			pendingNotifications.splice(notification, 1);
		});
	}
	saveNotificationList(entriesNotificationList, function () {
		badgeShowNotificationQuantity(getUnvievedNotificationsCount(entriesNotificationList), function () {
			console.log("reschedule parseFollowing tag from processNotifications: " + Date());
			clearTimeout(processingTags);
			processingTags = setTimeout(parseFollowedTags, 30 * 1000);
		});
	});
}

function getUserHistory(callback) {
	if(settingsIsUsernameEntered()) {
		
		steem.api.getAccountHistory(settings.username, -1, 50, function (err, response) {
			if (err ) {
				console.log(err);
				if(callback) {
					callback();
				}
			} else {
				console.log("Checked replies");
				var counter = 0;
				response.forEach(item => {
					var operationType = item[1].op[0];
					if (operationType == "comment") {
						var reply = item[1].op[1];
						if (reply.author != settings.username) {
							var tagsList = JSON.parse(reply.json_metadata).tags;
							if(tagsList) {
								var tag = tagsList[0] + "/";	
							} else {
								var tag = "";
							}
							var permlink = "https://steemit.com/" + tag + "@" + reply.author + "/" + reply.permlink;
							var title = "@" + reply.author + " replied to your post";

							if (settings.showNotificationsForReplies) {
								prepareNotification({
									id: item[1].trx_id,
									title: title,
									body: reply.body,
									replyLink: permlink,
									json_metadata: reply.json_metadata,
									author: reply.author
								}, "reply")
							}
						}
					}

					counter++;

					if (counter >= response.length) {
						if (callback) {
							callback();
						}
					}
				})
			}
		});
	} else {
		if(callback) {
			callback();
		}
	}
}

/**
 * Check if specified entry was already processed (notification showed or at least scheduled to show)
 * @param {*} id entry id
 * @param {*} list array containing all showed notifications
 */
function entryAlreadyProcessed(id, list) {
	for (var i = list.length - 1; i >= 0; i--) {
		if (list[i].id == id) {
			return true;
		}
	}
	return false;
}

initialize();

