function displayEntryOnList(title, link, tags, id) {
    var content = document.getElementById("content");

    var item = document.createElement("div");
    item.classList.add("item");

    var a = document.createElement('a');
    var linkText = document.createTextNode(title);
    a.appendChild(linkText);
    a.title = title;
    a.href = link;
    a.id = id;

    var titleElement = document.createElement("span");
    titleElement.classList.add("item-content-title");
    titleElement.appendChild(a);

    var checkElement = document.createElement("span");
    checkElement.classList.add("item-content-check");
    checkElement.setAttribute("id", id);
    checkElement.setAttribute("title", "Set as read");

    var tagsElement = document.createElement("span");
    tagsElement.classList.add("item-content-tags");
    tagsElement.appendChild(document.createTextNode(tags));

    item.appendChild(titleElement);
    item.appendChild(checkElement);
    item.appendChild(tagsElement);

    item.setAttribute("id", "item-" + id);

    content.appendChild(item);
}

function removeEntryFromList(id) {
    var entryElement = document.getElementById("item-" + id);
    entryElement.remove();

    if ( ! isAnyEntryOnPopupList()) {
        $("#empty").show();
    } 

}

function isAnyEntryOnPopupList() {
    if (document.getElementById("content").firstChild) {
        return true;
    } else {
        return false;
    }

}

function handleEntryClick(id) {
    setEntryClicked(id);
    removeEntryFromList(id);
    badgeShowNotificationQuantity(getUnvievedNotificationsCount(entriesNotificationList));
    
    if ( ! isAnyEntryOnPopupList()) {
        showLatestEntries();
    }
}

function removeAllEntriesFromList() {
    var content = document.getElementById("content");
    while (content.firstChild) {
        content.removeChild(content.firstChild);
    }

    $("#empty").show();
}

function configurePopupActions() {
    $("#read-all").click(function () {
        setAllEntriesAsRead();
        removeAllEntriesFromList();
        badgeShowNotificationQuantity();
    });

    $("#settings").click(function () {
        chrome.runtime.openOptionsPage();
    });

    $("#content").on("mousedown", "a", function (event) {
        var entry = $(this)[0];
        handleEntryClick(entry.id);

        chrome.tabs.create({
            url: entry.href,
            active: !settings.openTabsInBackground
        });

    });

    $('.item-content-check').bind('click', function () {
        handleEntryClick(this.id);
    });
}

function showLatestEntries(callback) {
    var itemsDisplayed = 0;
    var itemIndex = entriesNotificationList.length - 1;
    while ( (itemsDisplayed < entriesOnPopupPage) && (itemIndex > 0) ) {
        var item = entriesNotificationList[itemIndex--];
        if(item.clicked == false) {
            displayEntryOnList(item.title, item.link, item.tags, item.id);
            itemsDisplayed++;
            $("#empty").hide();
        }
    }

    configurePopupActions();

    if (callback) {
        callback();
    }
}

function setEntryClicked(id) {
    for (let index = 0; index < entriesNotificationList.length; index++) {
        const element = entriesNotificationList[index];
        if (element.id == id) {
            entriesNotificationList[index].clicked = true;
            saveNotificationList(entriesNotificationList);
        }
    }
}

function setAllEntriesAsRead() {
    for (let index = 0; index < entriesNotificationList.length; index++) {
        entriesNotificationList[index].clicked = true;
    }
    saveNotificationList(entriesNotificationList);
}

function init() {

    settingsReadSettings(function () {
        readNotificationList(function () {
            showLatestEntries();
        });
    });

}

init();