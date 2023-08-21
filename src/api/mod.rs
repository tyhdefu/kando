use actix_web::{delete, get, HttpResponse, patch, post, Responder, ResponseError, Scope, web};
use serde::{Deserialize, Serialize};
use crate::api::board::{BoardId, CardId, CardListId, KandoBoardState};
use crate::api::data_store::{DataStore, DataStoreError};
use crate::api::data_store::file::{JsonFileAccessor, MappedDataStore};

mod data_store;
mod board;

pub type DataStorage = MappedDataStore<JsonFileAccessor>;

// POST   /boards/ -> Create a new board.
//
// GET    /boards/<board> -> Gets the current state of the board
// POST   /boards/<board> -> Replace the current state of the board.
// PATCH  /boards/<board> -> Modify a board e.g add / renaming a card list
//
// POST   /boards/<board>/cards/ -> Add a new card.
//
// GET    /boards/<board>/cards/<card> -> Get individual card.
// PATCH  /boards/<board>/cards/<card> -> Modify an individual card.
// DELETE /boards/<board>/cards/<card>

pub fn api_service() -> Scope {
    web::scope("/api")
        .service(get_board)
        .service(post_data)
        .service(patch_board_state)
        .service(append_card)
        .service(modify_card)
        .service(delete_card)
}

pub fn create_state_holder() -> DataStorage {
    let mut data_store = MappedDataStore::new();
    data_store.add_board("default".into(),  JsonFileAccessor::new("data/default.json".into(), true));
    data_store.add_board("basic".into(),    JsonFileAccessor::new("data/basic.json".into(), false));
    data_store.add_board("current".into(),  JsonFileAccessor::new("data/current.json".into(), false));
    #[cfg(test)]
    data_store.add_board("test".into(),  JsonFileAccessor::new("test/tmp/data".into(), false));
    data_store
}

// GET /boards/<board> -> Gets the current state of the board
#[get("/boards/{board}")]
async fn get_board(path: web::Path<BoardId>, store: web::Data<DataStorage>) -> Result<impl Responder, DataStoreError> {
    let board_id = path.into_inner();

    let board = store.get_board(&board_id).await?;

    Ok(HttpResponse::Ok().json(&board))
}

// POST   /boards/<board> -> Replace the current state of the board.
#[post("/boards/{board}")]
async fn post_data(path: web::Path<BoardId>, store: web::Data<DataStorage>, payload: web::Json<KandoBoardState>) -> Result<impl Responder, DataStoreError> {
    let board_id = path.into_inner();

    store.set_board(board_id, payload.into_inner()).await?;
    Ok(HttpResponse::Ok())
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
enum PatchBoardState {
    /// Move this card with the given id into the specified card list
    /// in the specified location
    #[serde(rename = "move_card")]
    MoveCard {
        id: CardId,
        to_list: CardListId,
        list_index: Option<usize>,
    },
    #[serde(rename = "rename_card_list")]
    RenameCardList {
        id: CardListId,
        to: String,
    }
    // TODO: Create new lists.
}

#[patch("/boards/{board}")]
async fn patch_board_state(path: web::Path<BoardId>,
                           store: web::Data<DataStorage>,
                           payload: web::Json<PatchBoardState>) -> Result<impl Responder, DataStoreError> {
    let board_id = path.into_inner();
    Ok(match payload.into_inner() {
        PatchBoardState::MoveCard {
            id,
            to_list,
            list_index
        } => {
            store.move_card(board_id, id, to_list, list_index).await?;
            HttpResponse::Ok().finish()
        }
        PatchBoardState::RenameCardList {
            id,
            to
        } => {
            store.rename_card_list(board_id, id, to).await?;
            HttpResponse::Ok().finish()
        }
    })
}

#[derive(Deserialize)]
struct AppendCard {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub desc: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub list: CardListId,
}

// POST   /boards/<board>/cards/ -> Add a new card.
#[post("/boards/{board}/cards")]
async fn append_card(path: web::Path<BoardId>, store: web::Data<DataStorage>, payload: web::Json<AppendCard>) -> Result<impl Responder, DataStoreError> {
    let board_id = path.into_inner();
    let append_card = payload.into_inner();
    let new_card = store.append_new_card(board_id, append_card.list, append_card.title, append_card.desc, append_card.tags).await?;
    Ok(HttpResponse::Ok().json(new_card))
}

#[derive(Deserialize)]
struct ModifyCard {
    pub title: Option<String>,
    pub desc: Option<String>,
}

// PATCH  /boards/<board>/cards/<card> -> Modify an individual card.
#[patch("/boards/{board}/cards/{card}")]
async fn modify_card(path: web::Path<(BoardId, CardId)>,
                     store: web::Data<DataStorage>,
                     payload: web::Json<ModifyCard>) -> Result<impl Responder, DataStoreError> {
    if payload.desc.is_none() && payload.title.is_none() {
        return Ok(HttpResponse::NotModified().finish());
    }
    let modify_card = payload.into_inner();
    let (board_id, card_id)  = path.into_inner();
    let card = store.modify_card(board_id, card_id, modify_card.title, modify_card.desc).await?;
    Ok(HttpResponse::Ok().json(card))
}

// DELETE /boards/<board>/cards/<card>
#[delete("/boards/{board}/cards/{card}")]
async fn delete_card(path: web::Path<(BoardId, CardId)>, store: web::Data<DataStorage>) -> Result<impl Responder, DataStoreError> {
    let (board_id, card_id) = path.into_inner();
    let card = store.delete_card(board_id, card_id).await?;
    Ok(HttpResponse::Ok().json(card))
}

impl ResponseError for DataStoreError {}

#[cfg(test)]
mod test {
    use super::*;
    use actix_web::test;
    use uuid::uuid;
    use crate::api::board::{Card, CardList};

    fn reset_test_dirs() {
        std::fs::remove_dir("test/tmp").unwrap();
    }

    fn make_simple_state() -> KandoBoardState {
        let mut state = KandoBoardState::default();
        let mut list = CardList::default();
        let uuid = CardId::new(uuid!("61bb19af-7e99-47c3-8b98-75522775e9f1"));
        let card = Card::new(uuid, "test title".into(), String::new(), vec![]);
        list.push_card(card);
        state.push_card_list(list);
        state
    }

    #[actix_web::test]
    async fn test_post_then_get_simple() {
        reset_test_dirs();
        let app = test::init_service(App::new().service(post_data).service(get_board)).await;
        let state = make_simple_state();
        
        let post_request = test::TestRequest::post()
            .uri("/data/test")
            .set_json(&state)
            .to_request();

        let post_result = test::call_service(&app, post_request).await;
        assert_eq!(StatusCode::OK, post_result.status());

        let get_request = test::TestRequest::get().uri("/data/test").to_request();

        let get_result = test::call_service(&app, get_request).await;

        assert_eq!(StatusCode::OK, get_result.status());
        let body = test::read_body(get_result).await;
        let body_state: KandoBoardState = serde_json::from_slice(&body).unwrap();
        assert_eq!(&state, &body_state);
    }
}
