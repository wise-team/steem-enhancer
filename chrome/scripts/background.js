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

function initialize() {

	settingsReadSettings(function (results) {
		settings = results.settings;
		settingsReadTags(function (tags) {
			followedTagsArray = tags;
			parseFollowedTags();
		});
	});

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
			var unprocessedEntries = 0;
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

				try {
					var Api = window.steemWS.Client.get(null, true);
					Api.initPromise.then(response => {
						Api.database_api().exec("get_discussions_by_created", [{
							tag: tag,
							limit: tagEntriesQuantity
						}]).then(response => {
							console.log("Checked tag: " + tag + ", posts: " + response.length);
							var counter = 0;
							if (response.length == 0) {
								tagIndex++;
								if (tagIndex >= followedTagsArray.length) {
									processNotifications(unprocessedEntries);
								}
								else {
									parseTagRecursively();
								}
							}
							response.forEach(item => {

								var metadata = JSON.parse(item.json_metadata);

								if (settingsNewEntriesNotification) {

									var imageUrl = "";

									if (metadata.image) {
										imageUrl = metadata.image[0];
									}

									if (!entryAlreadyProcessed(item.id, entriesNotificationList)) {
										var bodyWithoutHTMLTags = item.body.replace(/(<([^>]+)>)/ig, "");
										bodyWithoutHTMLTags = stripMarkdown(bodyWithoutHTMLTags);

										var shouldParseEntry = false;
										if (secondTag) {
											for (let index = 0; index < metadata.tags.length; index++) {
												const element = metadata.tags[index];

												if (element == secondTag) {
													shouldParseEntry = true;
													break;
												}
											}
										} else {
											shouldParseEntry = true;
										}

										if (shouldParseEntry) {
											if (settings.richNotificationsEnabled) {
												console.log("Preparing notification: " + item.id + ", " + item.title);
												pendingNotifications.push({
													id: item.id,
													title: item.title,
													body: bodyWithoutHTMLTags,
													image: imageUrl,
													link: "https://steemit.com/@" + item.author + "/" + item.permlink
												});
											}

											unprocessedEntries++;
											var tagsString = "#" + tag;
											if (secondTag) {
												tagsString = "#" + tag + " #" + secondTag;
											}
											entriesNotificationList.push({ id: item.id, title: item.title, tags: tagsString, link: "https://steemit.com/@" + item.author + "/" + item.permlink, clicked: false, timestamp: Date() });
										}

									}

									counter++;

									if (counter >= response.length) {
										tagIndex++;
										if (tagIndex >= followedTagsArray.length) {
											processNotifications(unprocessedEntries);
										}
										else {
											parseTagRecursively();
										}
									}
								}
							})
						});
					});
				} catch (err) {
					console.log(err);
					setTimeout(parseFollowedTags, 30 * 1000);
				}
				
			})()
		});
	})
}

function processNotifications(entriesQuantity) {

	if (entriesQuantity > maxRichNotifications) {
		soundsPlaySound();
		pendingNotifications = [];
		var notification = new Notification("You have many new posts", {
			icon: "../icons/48.png",
			body: "Visit steem to see new posts"
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
		if(entriesQuantity) {
			soundsPlaySound();
		}
		pendingNotifications.forEach(notification => {
			showRichNotification(notification);
			pendingNotifications.splice(notification, 1);
		});
	}
	saveNotificationList(entriesNotificationList, function () {
		badgeShowNotificationQuantity(getUnvievedNotificationsCount(entriesNotificationList), function () {
			setTimeout(parseFollowedTags, 30 * 1000);
		});
	});
}

function getUserHistory() {
	var Api = window.steemWS.Client.get(null, true);
	Api.initPromise.then(response => {
		Api.database_api().exec("get_account_history", ["nicniezgrublem", -1, 10]).then(res => {
			console.log(res);
			setTimeout(() => {
				getUserHistory();
			}, 10000);
		});
	});
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

