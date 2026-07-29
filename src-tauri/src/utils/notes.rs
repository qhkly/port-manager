use crate::models::{NoteData, NotesStorage};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 获取备注文件路径
fn get_notes_file_path(handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = handle.path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

    Ok(app_data_dir.join("notes.json"))
}

/// 加载所有备注
pub async fn load_notes(handle: &AppHandle) -> Result<NotesStorage, String> {
    let notes_path = get_notes_file_path(handle)?;

    if !notes_path.exists() {
        // 返回空存储
        return Ok(NotesStorage {
            version: 1,
            notes: std::collections::HashMap::new(),
        });
    }

    let content = tokio::fs::read_to_string(&notes_path)
        .await
        .map_err(|e| format!("读取备注文件失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("解析备注文件失败: {}", e))
}

/// 保存所有备注
pub async fn save_notes(handle: &AppHandle, storage: &NotesStorage) -> Result<(), String> {
    let notes_path = get_notes_file_path(handle)?;

    // 确保目录存在
    if let Some(parent) = notes_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("创建数据目录失败: {}", e))?;
    }

    let content = serde_json::to_string_pretty(storage)
        .map_err(|e| format!("序列化备注失败: {}", e))?;

    tokio::fs::write(&notes_path, content)
        .await
        .map_err(|e| format!("写入备注文件失败: {}", e))?;

    Ok(())
}

/// 保存或更新备注
pub async fn upsert_note(handle: &AppHandle, path: &str, note: &str) -> Result<(), String> {
    let mut storage = load_notes(handle).await?;

    let now = chrono::Utc::now().to_rfc3339();

    if let Some(existing) = storage.notes.get_mut(path) {
        existing.note = note.to_string();
        existing.updated_at = now;
    } else {
        storage.notes.insert(
            path.to_string(),
            NoteData {
                note: note.to_string(),
                created_at: now.clone(),
                updated_at: now,
            },
        );
    }

    save_notes(handle, &storage).await
}

/// 删除备注
pub async fn delete_note(handle: &AppHandle, path: &str) -> Result<bool, String> {
    let mut storage = load_notes(handle).await?;

    let existed = storage.notes.remove(path).is_some();

    if existed {
        save_notes(handle, &storage).await?;
    }

    Ok(existed)
}
