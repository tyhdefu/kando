use std::fmt::{Display, Formatter};
use std::io;
use async_trait::async_trait;
use serde_json::Error;
use crate::api::board::{BoardId, Card, KandoBoardState};

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
    async fn append_new_card(&mut self, board_id: BoardId, list_index: usize) -> Result<Card, DataStoreError>;
}

#[derive(Debug)]
pub enum DataStoreError {
    /// The board did not exist.
    BoardNotFound,
    /// When the card list did not exist.
    NoSuchList,
    /// An internal un-resolvable error occurred.
    InternalError(Box<String>),
    /// An error occurred when trying to serialize to json for the final response.
    SerializeError(serde_json::Error),
}

impl Display for DataStoreError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "Data Store Error: ")?;
        match self {
            DataStoreError::BoardNotFound => write!(f, "Board not found."),
            DataStoreError::NoSuchList => write!(f, ""),
            DataStoreError::InternalError(e) => write!(f, "Internal Error: {}", e),
            DataStoreError::SerializeError(e) => write!(f, "JSON Serialization error: {}", e),
        }
    }
}

impl From<io::Error> for DataStoreError {
    fn from(value: io::Error) -> Self {
        DataStoreError::InternalError(Box::new(format!("{}", value)))
    }
}

impl From<serde_json::Error> for DataStoreError {
    fn from(value: Error) -> Self {
        DataStoreError::SerializeError(value)
    }
}