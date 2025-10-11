// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}
use std::io::Read;
use std::sync::{Arc, Mutex};
use std::thread;
use tiny_http::{Header, Method, Response, Server};

fn main() {
    let shared_data = Arc::new(Mutex::new(String::new()));

    // 克隆一个引用到 HTTP 线程
    let data_ref = shared_data.clone();

    // 启动一个后台线程运行 HTTP 服务
    thread::spawn({
        let data_ref = data_ref.clone();
        move || {
            let server = Server::http("127.0.0.1:8010").expect("无法启动端口 8010");
            println!("✅ Local API 已启动: http://127.0.0.1:8010");

            for mut request in server.incoming_requests() {
                let method = request.method().clone();
                let url = request.url().to_string();

                match (method, url.as_str()) {
                    // 🧠 保存数据（POST）
                    (Method::Post, "/api/save") => {
                        let mut body = String::new();
                        request.as_reader().read_to_string(&mut body).unwrap();
                        println!("📥 Received: {}", body);

                        // 写入内存
                        let mut data = data_ref.lock().unwrap();
                        *data = body.clone();

                        let response = Response::from_string(r#"{"status":"saved"}"#)
                            .with_header(
                                Header::from_bytes("Content-Type", "application/json").unwrap(),
                            )
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                            )
                            .with_header(
                                Header::from_bytes(
                                    "Access-Control-Allow-Methods",
                                    "GET, POST, OPTIONS",
                                )
                                .unwrap(),
                            )
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Headers", "Content-Type")
                                    .unwrap(),
                            );
                        let _ = request.respond(response);
                    }

                    // 📤 获取数据（GET）
                    (Method::Get, "/api/get") => {
                        let data = data_ref.lock().unwrap();
                        let json = format!(r#"{{"data":"{}"}}"#, *data);
                        let response = Response::from_string(json)
                            .with_header(
                                Header::from_bytes("Content-Type", "application/json").unwrap(),
                            )
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                            )
                            .with_header(
                                Header::from_bytes(
                                    "Access-Control-Allow-Methods",
                                    "GET, POST, OPTIONS",
                                )
                                .unwrap(),
                            )
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Headers", "Content-Type")
                                    .unwrap(),
                            );
                        let _ = request.respond(response);
                    }

                    (Method::Options, _) => {
                        let response = Response::from_string("")
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                            )
                            .with_header(
                                Header::from_bytes(
                                    "Access-Control-Allow-Methods",
                                    "GET, POST, OPTIONS",
                                )
                                .unwrap(),
                            )
                            .with_header(
                                Header::from_bytes("Access-Control-Allow-Headers", "Content-Type")
                                    .unwrap(),
                            );
                        let _ = request.respond(response);
                    }

                    _ => {
                        let response = Response::from_string("404 Not Found").with_header(
                            Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                        );
                        let _ = request.respond(response);
                    }
                }
            }
        }
    });

    // 启动 Tauri 应用
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![is_dev_mode])
        .run(tauri::generate_context!())
        .expect("❌ 无法启动 Tauri 应用");
}
