use tokio::process::Command;

/// 终止指定进程
pub async fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        kill_process_unix(pid).await
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
async fn kill_process_unix(pid: u32) -> Result<(), String> {
    let output = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output()
        .await
        .map_err(|e| format!("执行 kill 命令失败: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("终止进程失败: {}", stderr))
    }
}

/// 终止进程组（包括子进程）
pub async fn kill_process_group(pid: u32) -> Result<(), String> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        kill_process_group_unix(pid).await
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
async fn kill_process_group_unix(pid: u32) -> Result<(), String> {
    let output = Command::new("kill")
        .args(["-9", &format!("-{}", pid)])
        .output()
        .await
        .map_err(|e| format!("执行 kill 命令失败: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("终止进程组失败: {}", stderr))
    }
}
