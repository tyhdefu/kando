//// DROPPING BEHAVIOUR ////

function getBoardId() {
    split = window.location.href.split("boards/");
    boardId = split[1];
    console.log("current board", boardId);
    return boardId;
}

// Allow dropping by preventing the default behaviour.
function allowDrop(ev) {
    //console.log("allowing dropping: " + ev);
    ev.preventDefault();
    //console.log("should drop above: " + shouldInsertAbove(ev.pageY, ev.target.closest(".card-drop-area")));
}

// Set data on drag event about what we're dragging.
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log("Setting data: " + ev.target.id);
}

// When user lets go of dragging. Add the card in the correct place.
function drop(ev) {
    console.log("drop: " + ev);
    console.log(ev);

    var data = ev.dataTransfer.getData("text");
    card = document.getElementById(data);
    if (card == null) {
        console.log("dropped object is not a card");
        return;
    }
    container = card.closest(".card-drop-area");

    dropOnto(ev, ev.target, container);
}

// Puts dropped element where it should be:
// - at the end of the list if we aren't dropping it on another card
// - before the dropped on card if top half
// - after the dropped on card if bottom half
function dropOnto(e, target, node) {
    if (target.classList.contains("card-list")) {
        console.log("appending at end of list");
        target.appendChild(node);
        e.preventDefault();
        return;
    }
    drop_area_node = target.closest(".card-drop-area");

    if (drop_area_node == null) {
        console.warn("Didn't drop onto a place you should drop");
        return;
    }

    card_list = drop_area_node.parentNode;

    insertAbove = shouldInsertAbove(e.pageY, drop_area_node);

    if (insertAbove) {
        console.log("Inserting before");
        card_list.insertBefore(node, drop_area_node);
    }
    else {
        console.log("Inserting after");
        card_list.insertBefore(node, drop_area_node.nextSibling);
    }
    e.preventDefault();
}

function shouldInsertAbove(dropY, drop_area) {
    card_list = drop_area.closest(".card-list");

    relY = card_list.scrollTop - drop_area.offsetTop + dropY;
    areaMidHeight = drop_area.offsetHeight / 2;
    console.log(`dropY: ${dropY} relY: ${relY} areaMidHeight: ${areaMidHeight}`);

    return relY < areaMidHeight;
}

//// DROPPING BEHAVIOUR END ////


//// Functions to make things editable ////

function doubleClickEditable(e) {
    console.log("double click");
    console.log(e);
    if (e.target.classList.contains("card-title")) {
        console.log("making card title editable");
        makeCardTitleEditable(true, e.target);
    }
    else if (e.target.classList.contains("card-header-title")) {
        console.log("making card title header editable");
        makeEditable(true, e.target);
    }
}

function loseFocus(e) {
    console.log("lost focus");
    if (e.target.classList.contains("card-title")) {
        makeCardTitleEditable(false, e.target);
        if (e.target.innerText.trim() == "") {
            e.target.closest(".card-drop-area").remove();
        }
    }
    else if (e.target.classList.contains("card-header-title")) {
        makeEditable(false, e.target);
        if (e.target.innerText.trim() == "") {
            e.target.innerText = "title..."
        }
    }
    saveCurrentCards().then(x => console.log("Saving because lost focus"));
}

function onEnterKey(ev) {
    if (ev.key != "Enter") {
        return;
    }
    console.log(ev);
    if (ev.target.classList.contains("card-title")) {
        makeCardTitleEditable(false, ev.target);
    }
    else if (ev.target.classList.contains("card-header-title")) {
        makeEditable(false, ev.target);
    }
    else {
        console.warn("mising case for onEnterKey");
    }
    console.log("Removing focus and selection");
    ev.target.blur();
    document.getSelection().removeAllRanges();
    saveCurrentCards().then(x => console.log("Saving because hit enter"));
}

function makeCardTitleEditable(editable, ct) {
    console.log("makeCardTitleEditable");
    console.log(ct);
    card = ct.closest(".card");
    card.draggable = !editable;
    
    makeEditable(editable, ct);
}

function makeEditable(editable, ct) {
    ct.contentEditable = editable;
    if (editable) {
        console.log(ct);
        ct.focus();

        selection = document.getSelection();
        
        range = document.createRange();
        range.setStart(ct, 0);
        range.setEnd(ct, 1);

        selection.removeAllRanges();
        selection.addRange(range);
    }
    else {
        ct.innerText = ct.innerText.trim();
    }
}

//// end

/// Card population / card addition code ///

// <div class="card-drop-area">
//   <div class="card">
//     <h3 class="card-title">Hello world</h3>
//     <p class="card-description">This is the description of the card.</p>
//   </div>
// </div>

function makeCardListItem(title_str, desc_str, id_str) {
    drop_area = document.createElement("div");
    drop_area.classList.add("card-drop-area");
    card = document.createElement("div");
    card.classList.add("card");
    title = document.createElement("h3");
    title.classList.add("card-title");
    title.innerText = title_str;
    desc = document.createElement("p");
    desc.classList.add("card-description");
    desc.innerText = desc_str;

    drop_area.appendChild(card);
    card.appendChild(title);
    card.appendChild(desc);

    card.id = id_str;

    cardEnable(card);
    cardTitleEditEnable(title);
    
    return drop_area;
}

function addCardButtonClick(ev) {
    console.log("adding new card");
    card_list = ev.target.parentNode.querySelector(".card-list");
    item = makeCardListItem("New card", "This is a new card");
    card_list.appendChild(item);
    saveCurrentCards().then(x => console.log("cards saved"));
}

async function loadCards() {
    console.log("loading cards");
    const response = await fetch("/api/data/" + getBoardId());
    /*try {
        console.log("hi");
        response = await fetch("/api/data/" + getBoardId());
        console.log("response", response);
        if (response.status == 404) {
            console.warn("404 on current", response);
            response = null;
        }
    } catch (error) {
        reponse = null;
        console.warn("current data not found, using default", error);
    }
    if (response == null) {
        console.log("requesting default data");
        response = await fetch("/api/data/default");
    }*/
    const data = await response.json();
    console.log("data", data);
    all_lists = document.querySelectorAll(".card-list");
    console.log("all_lists", all_lists);
    console.log("data.lists.length", data.lists.length);
    for (var i = 0; i < data.lists.length; i++) {
        console.log("i", i);
        list_element = all_lists.item(i);
        list = data.lists[i];
        console.log(`list ${i}:`, list);
        list.items.forEach(card => {
            console.log(card);
            card_element = makeCardListItem(card.title, card.desc, card.id);
            list_element.appendChild(card_element);
        });
    }
}

async function saveCurrentCards() {
    console.log("Saving cards");
    data = {
        lists: []
    };
    document.querySelectorAll(".card-list").forEach(cardList => {
        console.log("cardList", cardList);
        list = []
        cardList.querySelectorAll(".card").forEach(card => {
            console.log("saving card", card);
            id = card.id;
            title = card.querySelector(".card-title").innerText;
            desc = card.querySelector(".card-description").innerText;
            list.push({ id: id, title: title, desc: desc});
        });
        data.lists.push({ items: list });
    });
    console.log("saving data", data);
    saveCards(JSON.stringify(data));
}

async function saveCards(json) {
    const response = await fetch("/api/data/current", {
        method: "POST",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

document.querySelectorAll(".card-add-button").forEach(b => {
    b.addEventListener("click", addCardButtonClick);
});

/// END Card addition code ///

console.log("hello");

document.querySelectorAll(".card-list").forEach(cl => {
    cl.addEventListener("drop", drop);
    cl.addEventListener("dragover", allowDrop);
})

i = 0;

function cardEnable(c) {
    c.draggable = true;
    c.addEventListener("dragstart", drag);
    c.id = "card-" + i;
    i++;
}

function cardTitleEditEnable(c) {
    c.addEventListener("dblclick", doubleClickEditable);
    c.addEventListener("blur", loseFocus);
    c.addEventListener("keydown", onEnterKey);
}

document.querySelectorAll(".card").forEach(c => {
    cardEnable(c);
});

document.querySelectorAll(".card .card-title").forEach(ct => {
    cardTitleEditEnable(ct);
});

document.querySelectorAll(".card-header-title").forEach(ct => {
    ct.addEventListener("dblclick", doubleClickEditable);
    ct.addEventListener("blur", loseFocus);
    ct.addEventListener("keydown", onEnterKey);
});

loadCards()
