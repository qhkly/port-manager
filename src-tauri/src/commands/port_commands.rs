use crate::models::PortInfo;
use crate::utils;

/// 获取所有监听端口
#[tauri::command]
pub async fn get_all_ports() -> Result<Vec<PortInfo>, String> {
    utils::get_all_listening_ports().await
}

/// 终止占用指定端口的进程
#[tauri::command]
pub async fn kill_port_process(port: u16) -> Result<(), String> {
    // 首先获取端口信息以找到对应的进程
    let ports = utils::get_all_listening_ports().await?;

    let port_info = ports
        .iter()
        .find(|p| p.port == port)
        .ok_or_else(|| format!("端口 {} 未被占用或不存在", port))?;

    if let Some(process) = &port_info.process {
        utils::kill_process(process.pid).await
    } else {
        Err(format!("端口 {} 没有关联的进程", port))
    }
}
