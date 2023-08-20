use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Eq, Hash, PartialEq)]
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
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct CardList {
    items: Vec<Card>,
}

impl Default for CardList {
    fn default() -> Self {
        Self { items: vec![] }
    }
}

impl CardList {
    pub fn push_card(&mut self, card: Card) {
        self.items.push(card);
    }
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct Card {
    id: Uuid,
    title: String,
    desc: String,
    tags: Vec<String>,
}

impl Card {
    pub fn new(id: Uuid, title: String, desc: String, tags: Vec<String>) -> Self {
        Self {
            id,
            title,
            desc,
            tags,
        }
    }
}