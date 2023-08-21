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
    const card_i_id = node.querySelector(".card").getAttribute("i_id");
    if (target.classList.contains("card-list")) {
        console.log("appending at end of list", node);
        target.appendChild(node);
        e.preventDefault();
        const card_list_i_id = target.getAttribute("i_id");
        saveCardMove(card_i_id, card_list_i_id, undefined).then(x => console.log("Saved due to card dragged"));
        return;
    }
    const drop_area_node = target.closest(".card-drop-area");

    if (drop_area_node == null) {
        console.warn("Didn't drop onto a place you should drop");
        return;
    }

    const card_list = drop_area_node.parentNode;

    const insertAbove = shouldInsertAbove(e.pageY, drop_area_node);

    let target_index;

    let target_node_index = undefined;
    for (var i = 0; i < card_list.children; i++) {
        if (card_list.children.item(i).isSameNode()) {
            target_index = i;
            break;
        }
    }

    if (insertAbove) {
        console.log("Inserting before");
        card_list.insertBefore(node, drop_area_node);
    }
    else {
        console.log("Inserting after");
        target_index += 1;
        card_list.insertBefore(node, drop_area_node.nextSibling);
    }
    e.preventDefault();
    saveCardMove(card_i_id, card_list_i_id, target_index).then(x => console.log("Saved due to card dragged"));
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
        console.log("e.target: ", e.target);
        let i_id = e.target.parentNode.querySelector(".card-list").getAttribute("i_id");
        saveCardListTitle(i_id, e.target.innerText).then(x => console.log("Saving title of card list."));
        return;
    }

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

function makeCardList(id, title) {
    let card_list_container = document.createElement("div");
    card_list_container.classList.add("card-container");

    let list_header = document.createElement("div");
    list_header.classList.add("card-list-header");

    let list_header_title = document.createElement("h1");
    list_header_title.innerText = title;
    list_header_title.classList.add("card-header-title");

    list_header.appendChild(list_header_title);

    let list = document.createElement("div");
    list.classList.add("card-list");
    list.setAttribute("i_id", id);

    let add_card_button = document.createElement("button");
    add_card_button.classList.add("card-add-button");

    card_list_container.appendChild(list_header);
    card_list_container.appendChild(list);
    card_list_container.appendChild(add_card_button);
    
    cardListHeaderTitleEnable(list_header_title);
    enableCardList(list);

    return card_list_container;
}

function addCardButtonClick(ev) {
    console.log("adding new card");
    const card_list = ev.target.parentNode.querySelector(".card-list");

    let card_list_container = ev.target.parentNode.parentNode;

    const card_list_id = card_list.getAttribute("i_id");
    console.log("to card_list_id: ", card_list_id);

    const title = "New card";
    const i_id = null;
    const desc = "";
    const tags = [];

    console.log("title: ", title, " desc: ", desc, " index: ", card_list_id);

    const item = makeCardListItem(title, i_id, tags);
    card_list.appendChild(item);
    saveAddCard(title, desc, tags, card_list_id).then(x => {
        console.log("RESPONSE: ", x, " item: ", item);
        return x.json();
    }).then(json => {
        console.log("json: ", json);
        item.querySelector(".card").setAttribute("i_id", json.id);
    })
}

async function loadBoard() {
    console.log("loading board");
    const response = await fetch("/api/boards/" + getBoardId());
    const data = await response.json();
    console.log("data", data);
    const list_container = document.querySelector(".board");
    console.log("list_container: ", list_container);
    console.log("data.lists.length", data.lists.length);
    for (var i = 0; i < data.lists.length; i++) {
        console.log("i", i);
        const list = data.lists[i];
        const list_element = makeCardList(list.id, list.title);
        const list_element_entries = list_element.querySelector(".card-list");
        console.log("list_element: ", list_element);
        console.log(`list ${i}:`, list);
        list.items.forEach(card => {
            console.log(card);
            if (card.tags == undefined) {
                card.tags = [];
            }
            const card_element = makeCardListItem(card.title/*, card.desc*/, card.id, card.tags);
            list_element_entries.appendChild(card_element);
        });
        list_container.appendChild(list_element);
    }
}

async function saveAddCard(title, desc, tags, list_id) {
    console.log("Telling server we created a new card.");
    const data = {title: title, desc: desc, tags: tags, list: list_id};
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

// Save a card move. to_list_index may be undefined for appends.
async function saveCardMove(card_id, to_list_id, to_list_index) {
    const data = { move_card: {id: card_id, to_list: to_list_id, list_index: to_list_index}};
    const json = JSON.stringify(data);
    return await fetch("/api/boards/" + getBoardId(), {
        method: "PATCH",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

async function saveCardListTitle(card_list_id, new_title) {
    const data = { rename_card_list: {id: card_list_id, to: new_title} };
    const json = JSON.stringify(data);
    return await fetch("/api/boards/" + getBoardId(), {
        method: "PATCH",
        body: json,
        headers: {"Content-Type": "application/json; charset=UTF-8"}
    });
}

async function saveCurrentCards() {
    console.log("Saving cards");
    let data = {
        lists: []
    };
    document.querySelectorAll(".card-list").forEach(cardList => {
        console.log("cardList", cardList);
        card_list_i_id = cardList.getAttribute("i_id");
        let list = []
        cardList.querySelectorAll(".card").forEach(card => {
            console.log("saving card", card);
            const id = card.getAttribute("i_id");
            console.log("i_id: ", id);
            const title = card.querySelector(".card-title").innerText;
            //desc = card.querySelector(".card-description").innerText;
            const desc = "";
            const tags = []
            card.querySelectorAll(".card-tag").forEach(tag => {
                tags.push(tag.innerText);
            })
            list.push({ id: id, title: title, desc: desc, tags: tags});
        });
        let name = cardList.querySelector(".card-header-title").innerText;
        data.lists.push({ id: card_list_i_id, name: name, items: list });
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

function enableCardList(cl) {
    cl.addEventListener("drop", drop);
    cl.addEventListener("dragover", allowDrop);
}

document.querySelectorAll(".card-list").forEach(cl => {
    enableCardList(cl);
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

function cardListHeaderTitleEnable(ct) {
    ct.addEventListener("dblclick", doubleClickEditable);
    ct.addEventListener("blur", loseFocus);
    ct.addEventListener("keydown", onEnterKey);
}

document.querySelectorAll(".card-header-title").forEach(ct => {
    cardListHeaderTitleEnable(ct);
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

loadBoard()
