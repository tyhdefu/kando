use actix_files::NamedFile;
use actix_web::{get, Responder, web};
use log::info;

pub async fn default_board() -> impl Responder {
    NamedFile::open_async("static/board.html").await
}

#[get("/boards/{board}")]
pub async fn board(board: web::Path<String>) -> impl Responder {
    info!("board {}", board.into_inner());
    NamedFile::open_async("static/board.html").await
}

#[get("/board.js")]
async fn index_js() -> impl Responder {
    NamedFile::open_async("static/board.js").await
}

#[get("/board.css")]
async fn board_css() -> impl Responder {
    NamedFile::open_async("static/board.css").await
}

#[get("/favicon.svg")]
async fn icon() -> impl Responder {
    NamedFile::open_async("static/favicon.svg").await
}
