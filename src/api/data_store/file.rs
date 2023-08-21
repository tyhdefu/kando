use std::collections::HashMap;
use std::io;
use std::path::PathBuf;
use std::sync::Mutex;
use async_trait::async_trait;
use uuid::Uuid;
use crate::api::board::{BoardId, Card, CardId, KandoBoardState};
use crate::api::data_store::{DataStore, DataStoreError};

pub struct MappedDataStore<T: BoardStoreAccessor + Send + Sync> {
    map: HashMap<BoardId, T>
}

impl<T: BoardStoreAccessor + Send + Sync> MappedDataStore<T> {
    pub fn new() -> Self {
        Self { map: HashMap::new() }
    }

    pub fn add_board(&mut self, id: BoardId, accessor: T) {
        self.map.insert(id, accessor);
    }
}

#[async_trait]
impl<T: BoardStoreAccessor + Send + Sync> DataStore for MappedDataStore<T> {
    async fn get_board(&self, board_id: &BoardId) -> Result<KandoBoardState, DataStoreError> {
        let accessor = self.map.get(board_id).ok_or(DataStoreError::BoardNotFound)?;
        Ok(accessor.read().await?)
    }

    async fn set_board(&self, board_id: BoardId, state: KandoBoardState) -> Result<(), DataStoreError>{
        let accessor = self.map.get(&board_id).ok_or(DataStoreError::BoardNotFound)?;
        accessor.write(state).await?;
        Ok(())
    }

    async fn append_new_card(&self, board_id: BoardId, list_index: usize, title: String, desc: String, tags: Vec<String>) -> Result<Card, DataStoreError> {
        let accessor = self.map.get(&board_id).ok_or(DataStoreError::BoardNotFound)?;
        let mut state = accessor.read().await?;
        let id = CardId::new(Uuid::new_v4());
        let card = Card::new(id, title, desc, tags);
        state.get_card_list_mut(list_index).push_card(card.clone());
        accessor.write(state).await?;
        return Ok(card);
    }

    async fn modify_card(&self, board_id: BoardId, card_id: CardId, new_title: Option<String>, new_desc: Option<String>) -> Result<Card, DataStoreError> {
        let accessor = self.map.get(&board_id).ok_or(DataStoreError::BoardNotFound)?;
        let mut state = accessor.read().await?;
        let modified_card = match state.get_card_mut(&card_id) {
            None => return Err(DataStoreError::CardNotFound),
            Some(card) => {
                if let Some(title) = new_title {
                    card.set_title(title);
                }
                if let Some(desc) = new_desc {
                    card.set_desc(desc);
                }
                card.clone()
            }
        };
        accessor.write(state).await?;
        Ok(modified_card)
    }

    async fn delete_card(&self, board_id: BoardId, card_id: CardId) -> Result<Card, DataStoreError> {
        let accessor = self.map.get(&board_id).ok_or(DataStoreError::BoardNotFound)?;
        let mut state = accessor.read().await?;
        let card = state.remove_card(&card_id).ok_or(DataStoreError::CardNotFound)?;
        accessor.write(state).await?;
        Ok(card)
    }

    async fn move_card(&self, board_id: BoardId, card_id: CardId, list: usize, list_index: Option<usize>) -> Result<(), DataStoreError> {
        let accessor = self.map.get(&board_id).ok_or(DataStoreError::BoardNotFound)?;
        let mut state = accessor.read().await?;
        let result = state.move_card(&card_id, list, list_index);
        match result {
            None => Err(DataStoreError::InternalError(format!("No such card with id {:?}, no such list, or invalid list index", card_id))),
            Some(_) => {
                accessor.write(state).await?;
                Ok(())
            },
        }
    }
}

#[async_trait]
pub trait BoardStoreAccessor {
    async fn write(&self, state: KandoBoardState) -> io::Result<()>;

    async fn read(&self) -> io::Result<KandoBoardState>;
}

pub struct JsonFileAccessor {
    file: PathBuf,
    read_only: bool,
}

impl JsonFileAccessor {
    pub fn new(file: PathBuf, read_only: bool) -> Self {
        Self {
            file,
            read_only
        }
    }
}

#[async_trait]
impl BoardStoreAccessor for JsonFileAccessor {
    async fn write(&self, state: KandoBoardState) -> io::Result<()> {
        if self.read_only {
            return Err(io::Error::from(io::ErrorKind::PermissionDenied));
        }
        let s = serde_json::to_string_pretty(&state)?;
        std::fs::write(&self.file, s)
    }

    async fn read(&self) -> io::Result<KandoBoardState> {
        let s = std::fs::read_to_string(&self.file)?;
        Ok(serde_json::from_str(&s)?)
    }
}

struct TestFileAccessor {
    val: Mutex<Option<KandoBoardState>>,
}

#[async_trait]
impl BoardStoreAccessor for TestFileAccessor {
    async fn write(&self, state: KandoBoardState) -> io::Result<()> {
        let mut lock = self.val.try_lock().unwrap();
        *lock = Some(state);
        Ok(())
    }

    async fn read(&self) -> io::Result<KandoBoardState> {
        let lock = self.val.try_lock().unwrap();
        Ok(lock.clone().ok_or_else(|| io::Error::from(io::ErrorKind::NotFound))?)
    }
}