use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use actix_web::middleware::Logger;
use env_logger::Env;
use crate::api::api_service;

mod static_pages;
mod api;

#[get("api/test")]
async fn api_test() -> impl Responder {
    format!("Hello world.")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .route("/", web::get().to(static_pages::index))
            .route("/index.html", web::get().to(static_pages::index))
            .service(static_pages::index_js)
            .service(static_pages::styles_css)
            .service(echo)
            .service(api_test)
            .service(api_service())
    }).bind(("127.0.0.1", 8080))?
        .run()
        .await
}
