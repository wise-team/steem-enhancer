var entriesNotificationList = [];

var COLOR_NEW_NOTIFICATION = {
    color: [204, 0, 51, 255]
};

var audio = new Audio('../sounds/all-eyes-on-me.ogg');

var settings = {
    soundsEnabled: false,
    richNotificationsEnabled: true,
    openTabsInBackground: true,
    showImagesInNotifications: true,
    showNotificationsFromFeed: true,
    isInitialized: false,
    showNotificationsForReplies: true,
    username: ""
}

const entriesOnPopupPage = 10;

function badgeShowNotificationQuantity(quantity, callback) {
    if (quantity) {
        extensionSetBadge(COLOR_NEW_NOTIFICATION, quantity.toString());
    } else {
        extensionSetBadge(COLOR_NEW_NOTIFICATION, "");
    }
    if (callback) {
        callback();
    }
}

function extensionSetBadge(color, text) {
    chrome.browserAction.setBadgeBackgroundColor(color);
    chrome.browserAction.setBadgeText({
        text: text
    });
}

function getUnvievedNotificationsCount(list) {
    var counter = 0;
    list.forEach(entry => {
        if (entry.clicked != true) {
            counter++;
        }
    })
    return counter;
}

function soundsPlaySound() {
    if (settings.soundsEnabled) {
        audio.play();
    }     
}

function readNotificationList(callback) {
    chrome.storage.local.get({ entriesNotificationList: [] }, function (result) {
        entriesNotificationList = result.entriesNotificationList;
        if(callback) {
            callback();
        }
    });
}

function saveNotificationList(list, callback) {

    // list = [];
    
    chrome.storage.local.set({ entriesNotificationList: list }, function () {
        chrome.storage.local.get('entriesNotificationList', function (result) {
            if (callback) {
                callback();
            }
        });
    });
}

function settingsReadTags(callback) {
    chrome.storage.local.get({ followedTags: ["technocracy"] }, function (result) {
        if(callback) {
            callback(result.followedTags);
        }
    });
}

function settingsSaveFollowedTags(tagsArray) {
    chrome.storage.local.set({followedTags: tagsArray}, function () {
        console.log("Observed tags saved");
    })
}


function settingsReadSettings(callback) {
    chrome.storage.local.get({ settings: settings }, function (result) {
        settings = result.settings;
        if(callback) {
            callback(result);
        }
    });
}

function settingsSaveSettings(settings, callback) {
    chrome.storage.local.set({ settings: settings }, function (result) {
        if (callback) {
            callback(result);
        }
    });
}

function settingsIsUsernameEntered() {
    if((settings.username != "") && (settings.username != null) ) {
        return true;
    } else {
        return false;
    }
}

function stripMarkdown(md, options) {
    options = options || {};
    options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
    options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
    options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;

    var output = md || '';

    // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
    output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, '');

    try {
        if (options.stripListLeaders) {
            if (options.listUnicodeChar)
                output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
            else
                output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
        }
        if (options.gfm) {
            output = output
                // Header
                .replace(/\n={2,}/g, '\n')
                // Strikethrough
                .replace(/~~/g, '')
                // Fenced codeblocks
                .replace(/`{3}.*\n/g, '');
        }
        output = output
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Remove setext-style headers
            .replace(/^[=\-]{2,}\s*$/g, '')
            // Remove footnotes?
            .replace(/\[\^.+?\](\: .*?$)?/g, '')
            .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
            // Remove images
            .replace(/\!\[.*?\][\[\(].*?[\]\)]/g, '')
            // Remove inline links
            .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
            // Remove blockquotes
            .replace(/^\s{0,3}>\s?/g, '')
            // Remove reference-style links?
            .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
            // Remove atx-style headers
            .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, '$1$2$3')
            // Remove emphasis (repeat the line to remove double emphasis)
            .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
            .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
            // Remove code blocks
            .replace(/(`{3,})(.*?)\1/gm, '$2')
            // Remove inline code
            .replace(/`(.+?)`/g, '$1')
            // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
            .replace(/\n{2,}/g, '\n\n');
    } catch (e) {
        console.error(e);
        return md;
    }
    return output;
};