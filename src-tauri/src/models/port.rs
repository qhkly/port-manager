use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,
    pub status: PortStatus,
    pub process: Option<ProcessInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PortStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "occupied")]
    Occupied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub command: String,
    pub user: Option<String>,
}
