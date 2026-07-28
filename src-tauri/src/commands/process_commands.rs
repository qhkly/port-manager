/// 终止指定 PID 的进程
#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    crate::utils::kill_process(pid).await
}

/// 终止指定 PID 的进程组（包括子进程）
#[tauri::command]
pub async fn kill_process_group(pid: u32) -> Result<(), String> {
    crate::utils::kill_process_group(pid).await
}
