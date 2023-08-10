use actix_files::NamedFile;
use actix_web::{get, Responder};

pub async fn index() -> impl Responder {
    NamedFile::open_async("static/index.html").await
}

#[get("/index.js")]
async fn index_js() -> impl Responder {
    NamedFile::open_async("static/index.js").await
}

#[get("/styles.css")]
async fn styles_css() -> impl Responder {
    NamedFile::open_async("static/styles.css").await
}
