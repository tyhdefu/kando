use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Eq, Hash, PartialEq, Debug, Clone, Serialize, Deserialize)]
pub struct BoardId(String);

impl BoardId {
    pub fn new(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for BoardId {
    fn from(value: &str) -> Self {
        Self(value.into())
    }
}

#[derive(Eq, Hash, PartialEq, Debug, Clone, Serialize, Deserialize)]
pub struct CardListId(Uuid);

impl CardListId {
    pub fn new(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

#[derive(Eq, Hash, PartialEq, Debug, Clone, Serialize, Deserialize)]
pub struct CardId(Uuid);

impl CardId {
    pub fn new(uuid: Uuid) -> Self {
        Self(uuid)
    }
}


#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct KandoBoardState {
    lists: Vec<CardList>,
}

impl Default for KandoBoardState {
    fn default() -> Self {
        Self { lists: vec![] }
    }
}

impl KandoBoardState {
    pub fn push_card_list(&mut self, list: CardList) {
        self.lists.push(list);
    }

    pub fn get_card_list_mut(&mut self, index: usize) -> &mut CardList {
        &mut self.lists[index]
    }

    pub fn get_card_mut(&mut self, card_id: &CardId) -> Option<&mut Card> {
        self.lists.iter_mut().flat_map(|x| &mut x.items)
            .find(|x| x.id == *card_id)
    }

    pub fn remove_card(&mut self, card_id: &CardId) -> Option<Card> {
        for list in &mut self.lists {
            if let Some(index) =  list.items.iter().position(|x| x.id == *card_id) {
                return Some(list.items.remove(index));
            }
        }
        None
    }

    /// Attempts to move the card with the given uuid to another list and list position
    pub fn move_card(&mut self, card_id: &CardId, card_list: usize, list_index: Option<usize>) -> Option<Card> {
        let mut from = None;

        for i in 0..self.lists.len() {
            if let Some(index) = self.lists[i].items.iter().position(|x| x.id == *card_id) {
                from = Some((i, index));
            }
        }
        if from.is_none() {
            return None;
        }
        let (from_list, from_index) = from.unwrap();
        if card_list > self.lists.len() {
            return None;
        }
        return match list_index {
            None => {
                let card = self.lists[from_list].items.remove(from_index);
                self.lists[card_list].items.push(card.clone());
                Some(card)
            }
            Some(idx) => {
                if idx > self.lists[card_list].items.len() {
                    return None;
                }
                let card = self.lists[from_list].items.remove(from_index);
                self.lists[card_list].items.insert(idx, card.clone());
                Some(card)
            }
        }
    }
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct CardList {
    id: CardListId,
    items: Vec<Card>,
}

impl CardList {
    pub fn new(id: CardListId) -> Self {
        Self { id, items: vec![] }
    }

    pub fn push_card(&mut self, card: Card) {
        self.items.push(card);
    }

    pub fn get_card_mut(&mut self, id: CardId) -> Option<&mut Card> {
        self.items.iter_mut()
            .find(|c| c.id == id)
    }
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct Card {
    id: CardId,
    title: String,
    desc: String,
    tags: Vec<String>,
}

impl Card {
    pub fn new(id: CardId, title: String, desc: String, tags: Vec<String>) -> Self {
        Self {
            id,
            title,
            desc,
            tags,
        }
    }

    pub fn set_title(&mut self, title: String) {
        self.title = title;
    }

    pub fn set_desc(&mut self, desc: String) {
        self.desc = desc;
    }
}