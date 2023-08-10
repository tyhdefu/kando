use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use std::sync::Mutex;
use actix_web::middleware::Logger;
use env_logger::Env;
use log::info;

mod static_pages;

struct AppStateWithCounter {
    counter: Mutex<i32>, // <- Mutex is necessary to mutate safely across threads
}

#[get("api/test")]
async fn api_test() -> impl Responder {
    format!("Hello world.")
}

#[get("/count")]
async fn count(data: web::Data<AppStateWithCounter>) -> String {
    let mut counter = data.counter.lock().unwrap(); // <- get counter's MutexGuard
    *counter += 1; // <- access counter inside MutexGuard
    info!("Request number now: {counter}");
    format!("Request number: {counter}") // <- response with count}
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

async fn manual_hello() -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let counter = web::Data::new(AppStateWithCounter {
        counter: Mutex::new(0),
    });

    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(counter.clone())
            .route("/", web::get().to(static_pages::index))
            .route("/index.html", web::get().to(static_pages::index))
            .service(static_pages::index_js)
            .service(static_pages::styles_css)
            .service(count)
            .service(echo)
            .service(api_test)
    }).bind(("127.0.0.1", 8080))?
        .run()
        .await
}
