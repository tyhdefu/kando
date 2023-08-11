use std::fs::OpenOptions;
use std::io;
use std::io::Write;
use std::path::PathBuf;
use actix_files::NamedFile;
use actix_web::{get, HttpResponse, post, Responder, Scope, web};
use log::info;
use serde::{Serialize, Deserialize};

pub fn api_service() -> Scope {
    web::scope("/api")
        .service(get_data)
        .service(post_data)
}

#[get("/data/{resource}")]
async fn get_data(path: web::Path<String>) -> impl Responder {
    let resource = path.into_inner();
    match resource.as_str() {
        "default" => Ok(NamedFile::open_async("data/basic.json").await),
        "current" => Ok(NamedFile::open_async("data/current.json").await),
        _ => Err(io::Error::from(io::ErrorKind::NotFound)),
    }
}

#[post("/data/{resource}")]
async fn post_data(path: web::Path<String>, payload: web::Json<KandoBoardState>) -> impl Responder {

    let resource = path.into_inner();
    let path: PathBuf = match resource.as_str() {
        "default" => "data/basic.json".into(),
        "current" => "data/current.json".into(),
        _ => return Err(io::Error::from(io::ErrorKind::NotFound)),
    };

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&path)?;

    let s = serde_json::to_string_pretty(&payload.into_inner())?;
    write!(file, "{}", s)?;
    info!("Write {} to {:?}", s, path);

    Ok(HttpResponse::Ok())

    //Ok(NamedFile::open_async("").await)
}

#[derive(Serialize, Deserialize)]
struct KandoBoardState {
    lists: Vec<CardList>
}

#[derive(Serialize, Deserialize)]
struct CardList {
    items: Vec<Card>
}

#[derive(Serialize, Deserialize)]
struct Card {
    id: String,
    title: String,
    desc: String,
}

