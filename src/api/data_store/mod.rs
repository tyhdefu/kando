use std::fmt::{Display, Formatter};
use std::io;
use async_trait::async_trait;
use serde_json::Error;
use crate::api::board::{BoardId, Card, CardId, CardListId, KandoBoardState};

pub mod file;

/// Handles storing and retrieving data.
#[async_trait]
pub trait DataStore {
    /// Get the current state of the board.
    /// If the board exists, it's state will be returned.
    async fn get_board(&self, board_id: &BoardId) -> Result<KandoBoardState, DataStoreError>;

    /// Set the state of the given board id to the given state.
    /// This will replace any existing state, if it exists.
    async fn set_board(&self, board_id: BoardId, state: KandoBoardState) -> Result<(), DataStoreError>;

    /// Append a new card into the given board and onto the give card list.
    async fn append_new_card(&self, board_id: BoardId, list_index: CardListId, title: String, desc: String, tags: Vec<String>) -> Result<Card, DataStoreError>;

    async fn modify_card(&self, board_id: BoardId, card_id: CardId, new_title: Option<String>, new_desc: Option<String>) -> Result<Card, DataStoreError>;

    async fn delete_card(&self, board_id: BoardId, card_id: CardId) -> Result<Card, DataStoreError>;

    /// Move the card to the given list within the given board.
    /// If the list_index is supplied, this defines the position within the list to move the card to.
    /// Otherwise the card is appended to the list.
    async fn move_card(&self, board_id: BoardId, card_id: CardId, list: CardListId, list_index: Option<usize>) -> Result<(), DataStoreError>;

    /// Change the title of the given card list.
    async fn rename_card_list(&self, board_id: BoardId, card_list: CardListId, to: String) -> Result<(), DataStoreError>;
}

#[derive(Debug)]
pub enum DataStoreError {
    /// The board did not exist.
    BoardNotFound,
    CardNotFound,
    CardListNotFound,
    /// An internal un-resolvable error occurred.
    InternalError(String),
    /// An error occurred when trying to serialize to json for the final response.
    SerializeError(serde_json::Error),
    InvalidId(String),
}

impl Display for DataStoreError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "Data Store Error: ")?;
        match self {
            DataStoreError::BoardNotFound => write!(f, "Board not found."),
            DataStoreError::CardNotFound => write!(f, "Card not found"),
            DataStoreError::CardListNotFound => write!(f, "Card list not found"),
            DataStoreError::InternalError(e) => write!(f, "Internal Error: {}", e),
            DataStoreError::SerializeError(e) => write!(f, "JSON Serialization error: {}", e),
            DataStoreError::InvalidId(e) => write!(f, "Invalid ID: {}", e),
        }
    }
}

impl From<io::Error> for DataStoreError {
    fn from(value: io::Error) -> Self {
        DataStoreError::InternalError(format!("{}", value))
    }
}

impl From<serde_json::Error> for DataStoreError {
    fn from(value: Error) -> Self {
        DataStoreError::SerializeError(value)
    }
}