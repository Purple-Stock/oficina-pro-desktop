use serde_json::{json, Value};
use std::path::{Path, PathBuf};

fn ok<T: serde::Serialize>(data: T) -> Value {
    json!({ "ok": true, "data": data })
}

fn err(code: &str, message: &str) -> Value {
    json!({
        "ok": false,
        "error": { "code": code, "message": message }
    })
}

pub fn backups_export_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not resolve the home directory")?;
    let dir = home.join("Downloads").join("Purple Stock").join("backups");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn sanitize_json_filename(filename: &str) -> Result<String, String> {
    let trimmed = filename.trim();
    if trimmed.is_empty() || !trimmed.to_ascii_lowercase().ends_with(".json") {
        return Err("Invalid backup filename".to_string());
    }

    let stem = trimmed[..trimmed.len() - 5].trim();
    if stem.is_empty() {
        return Err("Invalid backup filename".to_string());
    }

    let safe_stem: String = stem
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '-'
            }
        })
        .collect();

    let normalized = safe_stem
        .trim_matches('-')
        .chars()
        .fold(String::new(), |mut acc, character| {
            if character == '-' && acc.ends_with('-') {
                return acc;
            }
            acc.push(character);
            acc
        });

    if normalized.is_empty() {
        return Err("Invalid backup filename".to_string());
    }

    Ok(format!("{normalized}.json"))
}

fn resolve_unique_path(directory: &Path, filename: &str) -> PathBuf {
    let mut candidate = directory.join(filename);
    if !candidate.exists() {
        return candidate;
    }

    let stem = filename.trim_end_matches(".json");
    for index in 2..=999 {
        candidate = directory.join(format!("{stem}-{index}.json"));
        if !candidate.exists() {
            return candidate;
        }
    }

    directory.join(format!(
        "{stem}-{}.json",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_secs())
            .unwrap_or(0)
    ))
}

#[tauri::command]
pub fn export_full_backup(
    state: tauri::State<'_, crate::db::DbState>,
    filename: String,
) -> Result<Value, String> {
    let safe_filename = match sanitize_json_filename(&filename) {
        Ok(value) => value,
        Err(message) => return Ok(err("INVALID_INPUT", &message)),
    };

    let conn = state.conn.lock().map_err(|error| error.to_string())?;
    let backup = match crate::db::build_full_backup(&conn) {
        Ok(value) => value,
        Err(message) => return Ok(err("EXPORT_FAILED", &message)),
    };

    let directory = match backups_export_dir() {
        Ok(value) => value,
        Err(message) => return Ok(err("EXPORT_FAILED", &message)),
    };

    let file_path = resolve_unique_path(&directory, &safe_filename);
    let serialized = serde_json::to_string_pretty(&backup).map_err(|error| error.to_string())?;

    if let Err(error) = std::fs::write(&file_path, serialized) {
        return Ok(err("EXPORT_FAILED", &error.to_string()));
    }

    Ok(ok(json!({
        "filePath": file_path.to_string_lossy(),
        "fileName": file_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or(&safe_filename),
        "directory": directory.to_string_lossy(),
    })))
}

#[tauri::command]
pub fn delete_all_data(state: tauri::State<'_, crate::db::DbState>) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|error| error.to_string())?;
    match crate::db::delete_all_data(&conn) {
        Ok(summary) => Ok(ok(summary)),
        Err(message) => Ok(err("DELETE_FAILED", &message)),
    }
}

#[tauri::command]
pub fn import_team_backup(
    state: tauri::State<'_, crate::db::DbState>,
    team_id: i64,
    json_content: String,
) -> Result<Value, String> {
    if json_content.trim().is_empty() {
        return Ok(err("INVALID_INPUT", "Backup file is empty"));
    }

    let payload: Value = match serde_json::from_str(&json_content) {
        Ok(value) => value,
        Err(error) => {
            return Ok(err(
                "INVALID_INPUT",
                &format!("Invalid backup JSON: {error}"),
            ))
        }
    };

    let conn = state.conn.lock().map_err(|error| error.to_string())?;
    match crate::db::import_team_backup(&conn, team_id, &payload) {
        Ok(summary) => Ok(ok(summary)),
        Err(message) => Ok(err("IMPORT_FAILED", &message)),
    }
}

#[tauri::command]
pub fn preview_team_items_csv(
    state: tauri::State<'_, crate::db::DbState>,
    team_id: i64,
    csv_content: String,
) -> Result<Value, String> {
    if csv_content.trim().is_empty() {
        return Ok(err("INVALID_INPUT", "CSV content is required"));
    }

    let conn = state.conn.lock().map_err(|error| error.to_string())?;
    match crate::db::preview_team_items_csv(&conn, team_id, &csv_content) {
        Ok(preview) => Ok(ok(preview)),
        Err(message) => Ok(err("INVALID_INPUT", &message)),
    }
}

#[tauri::command]
pub fn import_team_items_csv(
    state: tauri::State<'_, crate::db::DbState>,
    team_id: i64,
    csv_content: String,
) -> Result<Value, String> {
    if csv_content.trim().is_empty() {
        return Ok(err("INVALID_INPUT", "CSV content is required"));
    }

    let conn = state.conn.lock().map_err(|error| error.to_string())?;
    match crate::db::import_team_items_csv(&conn, team_id, &csv_content) {
        Ok(summary) => Ok(ok(summary)),
        Err(message) => Ok(err("IMPORT_FAILED", &message)),
    }
}