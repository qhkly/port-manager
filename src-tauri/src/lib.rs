mod commands;
mod models;
mod utils;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 启动自动刷新
            start_auto_refresh(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_all_ports,
            commands::kill_port_process,
            commands::kill_process,
            commands::kill_process_group,
            commands::get_all_notes,
            commands::save_note,
            commands::delete_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_auto_refresh(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        use tokio::time::{interval, Duration};

        let mut timer = interval(Duration::from_secs(10)); // 每10秒刷新

        loop {
            timer.tick().await;

            // 获取所有监听端口
            match crate::utils::get_all_listening_ports().await {
                Ok(ports) => {
                    let n = ports.len();
                    match app.emit("ports-update", ports) {
                        Ok(()) => eprintln!("[auto-refresh] emitted {} ports", n),
                        Err(e) => eprintln!("[auto-refresh] emit failed: {}", e),
                    }
                }
                Err(e) => eprintln!("[auto-refresh] scan failed: {}", e),
            }
        }
    });
}
