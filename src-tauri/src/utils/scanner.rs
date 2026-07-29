use crate::models::{PortInfo, PortStatus, ProcessInfo};
use tokio::process::Command;

/// 获取指定进程的工作目录 (macOS)
#[cfg(target_os = "macos")]
async fn get_process_cwd(pid: u32) -> Option<String> {
    let output = Command::new("lsof")
        .args(["-p", &pid.to_string()])
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    // 解析 lsof 输出，查找 cwd 行
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        if line.contains("cwd") && line.contains("DIR") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 9 {
                let path = parts[8];
                // 过滤掉非路径的 cwd（如某些特殊设备）
                if path.starts_with('/') || path.starts_with('~') {
                    return Some(path.to_string());
                }
            }
        }
    }
    None
}

/// 获取指定进程的工作目录 (Linux)
#[cfg(target_os = "linux")]
async fn get_process_cwd(pid: u32) -> Option<String> {
    let output = Command::new("readlink")
        .args(["-e", &format!("/proc/{}/cwd", pid)])
        .output()
        .await
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }
    None
}

/// 获取所有监听端口信息
pub async fn get_all_listening_ports() -> Result<Vec<PortInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        get_ports_lsof().await
    }
    #[cfg(target_os = "linux")]
    {
        get_ports_ss().await
    }
}

#[cfg(target_os = "macos")]
async fn get_ports_lsof() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-i", "-P", "-n"])
        .output()
        .await
        .map_err(|e| format!("lsof 命令执行失败: {}", e))?;

    if !output.status.success() {
        return Err("lsof 命令返回错误状态".to_string());
    }

    let mut ports = parse_lsof_output(String::from_utf8_lossy(&output.stdout).to_string())?;

    // 为每个进程获取工作目录（并发执行以提高性能）
    let mut tasks = Vec::new();
    for port in &mut ports {
        if let Some(process) = &mut port.process {
            let pid = process.pid;
            let task = tokio::spawn(async move {
                (pid, get_process_cwd(pid).await)
            });
            tasks.push(task);
        }
    }

    // 收集结果并更新 ProcessInfo
    for task in tasks {
        if let Ok((pid, cwd)) = task.await {
            if let Some(port) = ports.iter_mut().find(|p| p.process.as_ref().map(|p| p.pid) == Some(pid)) {
                if let Some(process) = &mut port.process {
                    process.cwd = cwd;
                }
            }
        }
    }

    Ok(ports)
}

#[cfg(target_os = "macos")]
fn parse_lsof_output(output: String) -> Result<Vec<PortInfo>, String> {
    let mut ports = Vec::new();

    // lsof 输出格式:
    // COMMAND   PID   USER   FD   TYPE  DEVICE  SIZE/OFF  NODE  NAME
    // node    12345  user   22u  IPv4  0x...   0t0   TCP  *:32149 (LISTEN)
    // node    12345  user   23u  IPv6  0x...   0t0   TCP  *:32149 (LISTEN)

    for line in output.lines().skip(1) {
        // 跳过非 TCP 行
        if !line.contains("TCP") || !line.contains("LISTEN") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let command = parts[0];
        let pid = parts[1].parse::<u32>().unwrap_or(0);
        let user = parts[2].to_string();
        let name = parts[8];

        // 解析端口信息: *:32149 (LISTEN) 或 127.0.0.1:32149 (LISTEN)
        let port = if let Some(port_str) = name.split(':').last() {
            if let Some(port_str) = port_str.split_whitespace().next() {
                port_str.parse::<u16>().unwrap_or(0)
            } else {
                0
            }
        } else {
            0
        };

        if port == 0 {
            continue;
        }

        // 检查是否是 IPv4 或 IPv6
        let protocol = if line.contains("IPv4") {
            "TCP4".to_string()
        } else if line.contains("IPv6") {
            "TCP6".to_string()
        } else {
            "TCP".to_string()
        };

        ports.push(PortInfo {
            port,
            protocol,
            status: PortStatus::Occupied,
            process: Some(ProcessInfo {
                pid,
                name: command.to_string(),
                command: line.to_string(),
                user: Some(user),
                cwd: None,
            }),
        });
    }

    Ok(ports)
}

#[cfg(target_os = "linux")]
async fn get_ports_ss() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("ss")
        .args(["-tulpn"])
        .output()
        .await
        .map_err(|e| format!("ss 命令执行失败: {}", e))?;

    if !output.status.success() {
        return Err("ss 命令返回错误状态".to_string());
    }

    let mut ports = parse_ss_output(String::from_utf8_lossy(&output.stdout).to_string())?;

    // 为每个进程获取工作目录（并发执行以提高性能）
    let mut tasks = Vec::new();
    for port in &mut ports {
        if let Some(process) = &mut port.process {
            let pid = process.pid;
            let task = tokio::spawn(async move {
                (pid, get_process_cwd(pid).await)
            });
            tasks.push(task);
        }
    }

    // 收集结果并更新 ProcessInfo
    for task in tasks {
        if let Ok((pid, cwd)) = task.await {
            if let Some(port) = ports.iter_mut().find(|p| p.process.as_ref().map(|p| p.pid) == Some(pid)) {
                if let Some(process) = &mut port.process {
                    process.cwd = cwd;
                }
            }
        }
    }

    Ok(ports)
}

#[cfg(target_os = "linux")]
fn parse_ss_output(output: String) -> Result<Vec<PortInfo>, String> {
    let mut ports = Vec::new();

    // ss 输出格式:
    // State   Recv-Q   Send-Q     Local Address:Port      Peer Address:Port   Process
    // LISTEN  0        4096       127.0.0.1:32149         0.0.0.0:*           users:(("node",pid=12345,fd=22))

    for line in output.lines().skip(1) {
        if !line.contains("LISTEN") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let local_addr = parts[3]; // Local Address:Port
        let process_info = parts.last().unwrap_or(&"");

        // 解析端口: 127.0.0.1:32149 或 *:32149
        let port = if let Some(port_str) = local_addr.split(':').last() {
            port_str.parse::<u16>().unwrap_or(0)
        } else {
            0
        };

        if port == 0 {
            continue;
        }

        // 解析进程信息: users:(("node",pid=12345,fd=22))
        let (pid, name, user) = if let Some(pid_str) = process_info.split("pid=").nth(1) {
            let pid = pid_str.split(',').next().unwrap_or("0")
                .parse::<u32>().unwrap_or(0);

            let name = if let Some(name_part) = process_info.split("(\"").nth(1) {
                name_part.split("\",").next().unwrap_or("unknown").to_string()
            } else {
                "unknown".to_string()
            };

            (pid, name, None)
        } else {
            (0, "unknown".to_string(), None)
        };

        ports.push(PortInfo {
            port,
            protocol: "TCP".to_string(),
            status: PortStatus::Occupied,
            process: if pid > 0 {
                Some(ProcessInfo {
                    pid,
                    name,
                    command: line.to_string(),
                    user,
                    cwd: None,
                })
            } else {
                None
            },
        });
    }

    Ok(ports)
}
