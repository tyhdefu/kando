//// DROPPING BEHAVIOUR ////

function getBoardId() {
    const split = window.location.href.split("boards/");
    const boardId = split[1];
    console.log("current board '" + boardId + "'");
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
    const container = card.closest(".card-drop-area");

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
        saveCurrentCards().then(x => console.log("Saved due to card dragged"));
        return;
    }
    const drop_area_node = target.closest(".card-drop-area");

    if (drop_area_node == null) {
        console.warn("Didn't drop onto a place you should drop");
        return;
    }

    const card_list = drop_area_node.parentNode;

    const insertAbove = shouldInsertAbove(e.pageY, drop_area_node);

    if (insertAbove) {
        console.log("Inserting before");
        card_list.insertBefore(node, drop_area_node);
    }
    else {
        console.log("Inserting after");
        card_list.insertBefore(node, drop_area_node.nextSibling);
    }
    e.preventDefault();
    saveCurrentCards().then(x => console.log("Saved due to card dragged"));
}

function shouldInsertAbove(dropY, drop_area) {
    const card_list = drop_area.closest(".card-list");

    const relY = card_list.scrollTop - drop_area.offsetTop + dropY;
    const areaMidHeight = drop_area.offsetHeight / 2;
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
        let i_id = e.target.parentNode.getAttribute("i_id");
        if (e.target.innerText.trim() == "") {
            e.target.closest(".card-drop-area").remove();
            saveDeleteCard(i_id).then(x => console.log("Deleted card because lost focus and title was empty"));
            return;
        }
        saveModifyCard(i_id, e.target.innerText, undefined).then(x => console.log("Saving because lost focus"));
        return;
    }
    else if (e.target.classList.contains("card-header-title")) {
        makeEditable(false, e.target);
        if (e.target.innerText.trim() == "") {
            e.target.innerText = "title..."
        }
    }

    saveCurrentCards().then(x => console.log("Saving because lost focus (Old style)"));
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
    //let i_id = ev.target.parentNode.getAttribute("i_id");
    //saveModifyCard(i_id, ev.target.innerText, null).then(x => console.log(`Saving {i_id} because hit enter`));
}

function makeCardTitleEditable(editable, ct) {
    console.log("makeCardTitleEditable");
    console.log(ct);
    let card = ct.closest(".card");
    card.draggable = !editable;
    
    makeEditable(editable, ct);
}

function makeEditable(editable, ct) {
    ct.contentEditable = editable;
    if (editable) {
        console.log(ct);
        ct.focus();

        let selection = document.getSelection();
        
        let range = document.createRange();
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

function makeCardListItem(title_str,/* desc_str,*/ i_id_str, tag_list) {
    let drop_area = document.createElement("div");
    drop_area.classList.add("card-drop-area");
    let card = document.createElement("div");
    card.classList.add("card");
    let title = document.createElement("h3");
    title.classList.add("card-title");
    title.innerText = title_str;
    //desc = document.createElement("p");
    //desc.classList.add("card-description");
    //desc.innerText = desc_str;
    let tags = document.createElement("div");
    tags.classList.add("card-tags");

    tag_list.forEach(tag_str => {
        let tag = document.createElement("p");
        tag.innerText = tag_str;
        tag.classList.add("card-tag");
        tags.appendChild(tag);
    });

    drop_area.appendChild(card);
    card.appendChild(title);
    //card.appendChild(desc);
    card.appendChild(tags);

    card.setAttribute("i_id", i_id_str);

    cardEnable(card);
    cardTitleEditEnable(title);
    
    return drop_area;
}

function addCardButtonClick(ev) {
    console.log("adding new card");
    const card_list = ev.target.parentNode.querySelector(".card-list");

    let card_list_container = ev.target.parentNode.parentNode;

    console.log("Container: ", card_list_container);
    console.log("Searching for: ", ev.target.parentNode);
    for (var i = 0; i < card_list_container.children.length; i++) {
        if (ev.target.parentNode.isSameNode(card_list_container.children.item(i))) {
            card_list_index = i;
            console.log("Found card list index: ", card_list_index);
            break;
        }
    }
    console.log("Card list index: ", card_list_index);

    const title = "New card";
    const i_id = null;
    const desc = "";
    const tags = [];

    console.log("title: ", title, " desc: ", desc, " index: ", card_list_index);

    const item = makeCardListItem(title, i_id, tags);
    card_list.appendChild(item);
    console.log("title: ", title, " desc: ", desc, " index: ", card_list_index);
    saveAddCard(title, desc, tags, card_list_index).then(x => {
        console.log("RESPONSE: ", x, " item: ", item);
        return x.json();
    }).then(json => {
        console.log("json: ", json);
        item.querySelector(".card").setAttribute("i_id", json.id);
    })
}

async function loadCards() {
    console.log("loading cards");
    const response = await fetch("/api/boards/" + getBoardId());
    const data = await response.json();
    console.log("data", data);
    const all_lists = document.querySelectorAll(".card-list");
    console.log("all_lists", all_lists);
    console.log("data.lists.length", data.lists.length);
    for (var i = 0; i < data.lists.length; i++) {
        console.log("i", i);
        const list_element = all_lists.item(i);
        const list = data.lists[i];
        console.log(`list ${i}:`, list);
        list.items.forEach(card => {
            console.log(card);
            if (card.tags == undefined) {
                card.tags = [];
            }
            const card_element = makeCardListItem(card.title/*, card.desc*/, card.id, card.tags);
            list_element.appendChild(card_element);
        });
    }
}

async function saveAddCard(title, desc, tags, list_index) {
    console.log("Telling server we created a new card.");
    const data = {title: title, desc: desc, tags: tags, list: list_index};
    console.log("Data: ", data);
    const json = JSON.stringify(data);
    return await fetch("/api/boards/" + getBoardId() + "/cards", {
        method: "POST",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

async function saveModifyCard(card_id, new_title, new_desc) {
    const data = {title: new_title, desc: new_desc}
    console.log("Modify card data: ", data);
    const json = JSON.stringify(data);
    return await fetch("/api/boards/" + getBoardId() + "/cards/" + card_id, {
        method: "PATCH",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

async function saveDeleteCard(card_id) {
    return await fetch("/api/boards/" + getBoardId() + "/cards/" + card_id, {
        method: "DELETE"
    });
}

async function saveCurrentCards() {
    console.log("Saving cards");
    let data = {
        lists: []
    };
    document.querySelectorAll(".card-list").forEach(cardList => {
        console.log("cardList", cardList);
        let list = []
        cardList.querySelectorAll(".card").forEach(card => {
            console.log("saving card", card);
            const id = card.db_id;
            console.log("db id: ", id);
            const title = card.querySelector(".card-title").innerText;
            //desc = card.querySelector(".card-description").innerText;
            const desc = "";
            const tags = []
            card.querySelectorAll(".card-tag").forEach(tag => {
                tags.push(tag.innerText);
            })
            list.push({ id: id, title: title, desc: desc, tags: tags});
        });
        data.lists.push({ items: list });
    });
    console.log("saving data", data);
    saveCards(JSON.stringify(data));
}

async function saveCards(json) {
    const response = await fetch("/api/boards/" + getBoardId(), {
        method: "POST",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

document.querySelectorAll(".card-add-button").forEach(b => {
    b.addEventListener("click", addCardButtonClick);
});

/// END Card addition code ///

/// Board switching ///

function onBoardPick(ev) {
    console.log("board picked ", ev);
    let el = ev.target;
    const value = el.options[el.selectedIndex].value;
    console.log("switching to board '", value, "'");
    window.location.href = "/boards/" + value;
}

/// End board switching ///

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

document.querySelectorAll("#pick-board").forEach(b => {
    b.addEventListener("change", onBoardPick);
    const boardId = getBoardId();
    let curOption = null;
    for (var i = 0; i < b.options.length; i++) {
        console.log(b.options[i]);
        if (b.options[i].value == boardId) {
            curOption = b.options[i];
            b.selectedIndex = i;
            return;
        }
    }
    console.warn("Board option not found: " + boardId);
})

loadCards()
