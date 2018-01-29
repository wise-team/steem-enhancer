var settingsShowImages = true;
var settingsNewEntriesNotification = true;
const tagEntriesQuantity = 10;
const maxTagSearchingDept = 5;
var maxRichNotifications = 5;

var pendingNotifications = [];
var entriesNotificationList = [];

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
		var Api = window.steemWS.Client.get(null, true);
		Api.initPromise.then(response => {
			Api.database_api().exec("get_discussions_by_feed", [{
				tag: settings.username,
				limit: 10
			}]).then(response => { 
				console.log("Checked user feed");
	
				var counter = 0;
				response.forEach(item => {
	
					if(settings.richNotificationsEnabled && settings.showNotificationsFromFeed) {
						prepareNotification(item, item.author, null);
					}
	
					counter++;
	
					if (counter >= response.length) {
						if(callback) {
							callback();
						}	
					}
				})
			});
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
					}
				}
			}
			var tagsString = "#" + tag;
			if (conditionalTag) {
				tagsString = "#" + tag + " #" + conditionalTag;
			}
			entriesNotificationList.push({ id: item.id, title: item.title, tags: tagsString, link: link, clicked: false, timestamp: Date() });
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

				var Api = window.steemWS.Client.get(null, true);
				Api.initPromise.then(response => {
					Api.database_api().exec("get_discussions_by_created", [{
						tag: tag,
						limit: tagEntriesQuantity
					}]).then(response => {
						console.log("Checked tag: " + tag + " " + secondTag + ", posts: " + response.length);
						var counter = 0;
						if (response.length == 0) {
							tagIndex++;
							if (tagIndex >= followedTagsArray.length) {
								getUserFeed(function() {
									getUserHistory(function() {
										processNotifications();
									})
								});
							}
							else {
								parseTagRecursively();
							}
						}
						response.forEach(item => {
							prepareNotification(item, tag, secondTag);

							counter++;

							if (counter >= response.length) {
								tagIndex++;
								if (tagIndex >= followedTagsArray.length) {
									getUserFeed(function() {
										getUserHistory(function() {
											processNotifications();
										})
									});
								}
								else {
									parseTagRecursively();
								}
							}
						})
					});
				}).catch(function (err) {
					console.log(err);
					console.log("reschedule parseFollowing tag from error: " + Date());
					clearTimeout(processingTags);
					processingTags = setTimeout(parseFollowedTags, 30 * 1000);
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
		soundsPlaySound();
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
			soundsPlaySound();
		}
		pendingNotifications.forEach(notification => {
			showRichNotification(notification);
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
		var Api = window.steemWS.Client.get(null, true);
		Api.initPromise.then(response => {
			Api.database_api().exec("get_account_history", [settings.username, -1, 50]).then(res => {
				console.log("Checked replies");
				var counter = 0;
				res.forEach(item => {
					var operationType = item[1].op[0];
					if(operationType == "comment") {
						var reply = item[1].op[1];
						if(reply.author != settings.username) {
							var tag = JSON.parse(reply.json_metadata).tags[0];
							var permlink = "https://steemit.com/" + tag + "/@" + reply.author + "/" + reply.permlink;
							var title = "@" + reply.author + " replied to your post";
	
							if(settings.showNotificationsForReplies) {
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
	
					if (counter >= res.length) {
						if(callback) {
							callback();
						}	
					}
				})
			})
		})
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

