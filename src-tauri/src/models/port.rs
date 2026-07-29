use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    pub cwd: Option<String>,
}

/// 备注数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteData {
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 备注存储结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotesStorage {
    pub version: u32,
    pub notes: HashMap<String, NoteData>,
}
