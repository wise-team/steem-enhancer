function displayEntryOnList(title, link, tags, id) {
    var content = document.getElementById("content");

    var check_icon_open = document.createElement("i");
    check_icon_open.classList.add("fa");
    check_icon_open.classList.add("fa-square-o");
    check_icon_open.classList.add("icon-open");

    var check_icon_closed = document.createElement("i");
    check_icon_closed.classList.add("fa");
    check_icon_closed.classList.add("fa-check-square-o");
    check_icon_closed.classList.add("icon-checked");

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

    checkElement.appendChild(check_icon_open);
    checkElement.appendChild(check_icon_closed);

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
    setEntryClicked(id, function () {
        removeEntryFromList(id);

        let lastEntry = $("#content").children().last();

        if(lastEntry.length) {
            let lastEntryID = lastEntry.attr('id').replace('item-', '');
            showNextUnclickedEntry(lastEntryID);
        }

        badgeShowNotificationQuantity(getUnvievedNotificationsCount(entriesNotificationList));
        
        if ( ! isAnyEntryOnPopupList()) {
            showLatestEntries();
        }
    });
}

function removeAllEntriesFromList() {
    let content = document.getElementById("content");
    while (content.firstChild) {
        content.removeChild(content.firstChild);
    }

    $("#empty").show();
}

function configurePopupActions() {
    $('.actions').on('click', '#read-all', function (e) {
        setAllEntriesAsRead(function(){
            removeAllEntriesFromList();
            badgeShowNotificationQuantity();
        });
    });

    $('.actions').on('click', '#settings', function (e) {
        chrome.runtime.openOptionsPage();
    });

    $(".content").on("mousedown", "a", function (event) {
        var entry = $(this)[0];
        handleEntryClick(entry.id);

        chrome.tabs.create({
            url: entry.href,
            active: !settings.openTabsInBackground
        });

    });

    $('.content').on('click', '.item-content-check', function (e) {
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

function showNextUnclickedEntry(lastEntryID) {
    let i = entriesNotificationList.length - 1;
    let itemIndex = 0;

    while (i) {
        let item = entriesNotificationList[i--];
        if(item.id == lastEntryID) {
            itemIndex = i;
        }
    }

    while (itemIndex) {
        let item = entriesNotificationList[itemIndex--];
        if(item.clicked == false) {
            displayEntryOnList(item.title, item.link, item.tags, item.id);
            break;
        }
    }

}

function setEntryClicked(id, callback) {
    for (let index = 0; index < entriesNotificationList.length; index++) {
        const element = entriesNotificationList[index];
        if (element.id == id) {
            entriesNotificationList[index].clicked = true;
            saveNotificationList(entriesNotificationList, function() {
                if(callback) {
                    callback();
                }
            });
        }
    }
}

function setAllEntriesAsRead(callback) {
    for (let index = 0; index < entriesNotificationList.length; index++) {
        entriesNotificationList[index].clicked = true;
    }
    saveNotificationList(entriesNotificationList, function() {
        if(callback) {
            callback();
        }
    });
}

function init() {
    settingsReadSettings(function () {
        readNotificationList(function () {
            showLatestEntries();
        });
    });
}

init();