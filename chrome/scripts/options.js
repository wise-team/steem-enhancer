var followedTagsArray = [];

function init() {

    settingsReadTags(function (tags) {
        followedTagsArray = tags;
        if (followedTagsArray.length) {
            console.log("dodajemy: " + followedTagsArray);
            followedTagsArray.forEach(tag => {
                $('#followedTags').tagsinput('add', tag);    
            });
        } else {
            console.log("dodajemy technocracy");
            $('#followedTags').tagsinput('add', "technocracy");
        }
        settingsReadSettings(function (results) {
            settings = results.settings;
            document.getElementById('soundsEnabled').checked = settings.soundsEnabled;
            document.getElementById('richNotificationsEnabled').checked = settings.richNotificationsEnabled;
            document.getElementById('openTabsInBackground').checked = settings.openTabsInBackground;
            document.getElementById('showImagesInNotifications').checked = settings.showImagesInNotifications;
            document.getElementById('showNotificationsFromFeed').checked = settings.showNotificationsFromFeed;
            document.getElementById('showNotificationsForReplies').checked = settings.showNotificationsForReplies;
            document.getElementById('username').value = settings.username;

            
            document.getElementById('save').addEventListener('click', saveSettingsFromOptionsPage);
            
            // enable tooltips on all elements
            $('[data-toggle="tooltip"]').tooltip({
                trigger: 'hover'
            });

            $('#followedTags').on('itemAdded', function (event) {
                followedTagsArray = $('#followedTags').tagsinput('items');
                settingsSaveFollowedTags(followedTagsArray);
            });

            $('#followedTags').on('itemRemoved', function (event) {
                followedTagsArray = $('#followedTags').tagsinput('items');
                settingsSaveFollowedTags(followedTagsArray);
            });
        })
    });

}

function saveSettingsFromOptionsPage() {
    settingsSaveSettings({
        soundsEnabled: document.getElementById('soundsEnabled').checked,
        richNotificationsEnabled: document.getElementById('richNotificationsEnabled').checked,
        openTabsInBackground: document.getElementById('openTabsInBackground').checked,
        showImagesInNotifications: document.getElementById('showImagesInNotifications').checked,
        showNotificationsFromFeed: document.getElementById('showNotificationsFromFeed').checked,
        showNotificationsForReplies: document.getElementById('showNotificationsForReplies').checked,        
        username: document.getElementById('username').value
    }, function () {
        chrome.extension.getBackgroundPage().initialize();
    })
}

$('#followedTags').val("");

setTimeout(() => {
    init(); 
}, (100));