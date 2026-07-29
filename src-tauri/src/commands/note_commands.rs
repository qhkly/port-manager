use tauri::AppHandle;

/// 获取所有备注
#[tauri::command]
pub async fn get_all_notes(handle: AppHandle) -> Result<std::collections::HashMap<String, String>, String> {
    let storage = crate::utils::load_notes(&handle).await?;
    Ok(storage.notes.into_iter().map(|(k, v)| (k, v.note)).collect())
}

/// 保存备注
#[tauri::command]
pub async fn save_note(handle: AppHandle, path: String, note: String) -> Result<(), String> {
    crate::utils::upsert_note(&handle, &path, &note).await
}

/// 删除备注
#[tauri::command]
pub async fn delete_note(handle: AppHandle, path: String) -> Result<bool, String> {
    crate::utils::delete_note(&handle, &path).await
}
