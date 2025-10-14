// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Emitter;

#[tauri::command]
fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
fn send_to_tts(message: String) -> Result<String, String> {
    use std::io::Write;
    use std::net::TcpStream;

    match TcpStream::connect("127.0.0.1:39999") {
        Ok(mut stream) => {
            stream.write_all(message.as_bytes()).unwrap();
            Ok("发送成功".into())
        }
        Err(e) => Err(format!("连接 TTS 失败: {}", e)),
    }
}


#[tauri::command]
fn start_tts_listener(window: tauri::Window) {
    std::thread::spawn(move || {
        use std::io::Read;
        use std::net::TcpListener;

        if let Ok(listener) = TcpListener::bind("127.0.0.1:39998") {
            for stream in listener.incoming() {
                if let Ok(mut stream) = stream {
                    let mut buf = String::new();
                    if stream.read_to_string(&mut buf).is_ok() {
                        // 向前端发送事件
                        let _ = window.emit("tts-message", buf);
                    }
                }
            }
        }
    });
}

fn main() {
    // 启动 Tauri 应用
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            start_tts_listener,
            send_to_tts,
            is_dev_mode
        ]) // 添加 send_to_tts
        .run(tauri::generate_context!())
        .expect("❌ 无法启动 Tauri 应用");
}