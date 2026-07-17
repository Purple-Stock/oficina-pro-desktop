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

fn labels_export_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not resolve the home directory")?;
    let dir = home.join("Downloads").join("Oficina Pro").join("labels");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn sanitize_pdf_filename(filename: &str) -> Result<String, String> {
    let trimmed = filename.trim();
    if trimmed.is_empty() || !trimmed.to_ascii_lowercase().ends_with(".pdf") {
        return Err("Invalid PDF filename".to_string());
    }

    let stem = trimmed[..trimmed.len() - 4].trim();

    if stem.is_empty() {
        return Err("Invalid PDF filename".to_string());
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
        return Err("Invalid PDF filename".to_string());
    }

    Ok(format!("{normalized}.pdf"))
}

fn resolve_unique_path(directory: &Path, filename: &str) -> PathBuf {
    let mut candidate = directory.join(filename);
    if !candidate.exists() {
        return candidate;
    }

    let stem = filename.trim_end_matches(".pdf");
    for index in 2..=999 {
        candidate = directory.join(format!("{stem}-{index}.pdf"));
        if !candidate.exists() {
            return candidate;
        }
    }

    directory.join(format!("{stem}-{}.pdf", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0)))
}

#[tauri::command]
pub fn save_labels_pdf(filename: String, data: Vec<u8>) -> Result<Value, String> {
    if data.is_empty() {
        return Ok(err("INVALID_INPUT", "PDF data is empty"));
    }

    let safe_filename = match sanitize_pdf_filename(&filename) {
        Ok(value) => value,
        Err(message) => return Ok(err("INVALID_INPUT", &message)),
    };

    let directory = match labels_export_dir() {
        Ok(value) => value,
        Err(message) => return Ok(err("SAVE_FAILED", &message)),
    };

    let file_path = resolve_unique_path(&directory, &safe_filename);

    if let Err(error) = std::fs::write(&file_path, data) {
        return Ok(err("SAVE_FAILED", &error.to_string()));
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

fn resolve_pdf_path(file_path: &str, file_name: Option<&str>) -> Result<PathBuf, String> {
    let trimmed = file_path.trim();
    if trimmed.is_empty() {
        return Err("PDF path is empty".to_string());
    }

    let path = PathBuf::from(trimmed);
    if path.is_file() {
        return Ok(path);
    }

    if let Some(name) = file_name.filter(|value| !value.trim().is_empty()) {
        if let Ok(directory) = labels_export_dir() {
            let candidate = directory.join(name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
        if let Ok(directory) = labels_export_dir() {
            let candidate = directory.join(name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    Err(format!("PDF file not found: {}", path.display()))
}

fn open_file_in_default_app(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to open the PDF with the default app".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to open the PDF with the default app".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args([
                "/C",
                "start",
                "",
                &path.to_string_lossy().replace('/', "\\"),
            ])
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to open the PDF with the default app".to_string())
    }
}

fn reveal_file_in_folder(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to reveal the PDF in Finder".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        let parent = path
            .parent()
            .ok_or_else(|| "Could not resolve the PDF folder".to_string())?;
        std::process::Command::new("xdg-open")
            .arg(parent)
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to open the PDF folder".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path.display()))
            .status()
            .map_err(|error| error.to_string())?
            .success()
            .then_some(())
            .ok_or_else(|| "Failed to reveal the PDF in Explorer".to_string())
    }
}

#[tauri::command]
pub fn open_labels_pdf(file_path: String, file_name: Option<String>) -> Result<Value, String> {
    let path = match resolve_pdf_path(&file_path, file_name.as_deref()) {
        Ok(value) => value,
        Err(message) => return Ok(err("NOT_FOUND", &message)),
    };

    match open_file_in_default_app(&path) {
        Ok(()) => Ok(ok(Value::Null)),
        Err(message) => Ok(err("OPEN_FAILED", &message)),
    }
}

#[tauri::command]
pub fn reveal_labels_pdf(file_path: String, file_name: Option<String>) -> Result<Value, String> {
    let path = match resolve_pdf_path(&file_path, file_name.as_deref()) {
        Ok(value) => value,
        Err(message) => return Ok(err("NOT_FOUND", &message)),
    };

    match reveal_file_in_folder(&path) {
        Ok(()) => Ok(ok(Value::Null)),
        Err(message) => Ok(err("REVEAL_FAILED", &message)),
    }
}

#[cfg(test)]
mod tests {
    use super::{labels_export_dir, resolve_pdf_path, sanitize_pdf_filename};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn sanitize_pdf_filename_replaces_unsafe_characters() {
        assert_eq!(
            sanitize_pdf_filename("labels-Ops Team-2026-07-15.pdf").unwrap(),
            "labels-Ops-Team-2026-07-15.pdf"
        );
    }

    #[test]
    fn resolve_pdf_path_falls_back_to_labels_export_dir() {
        let directory = labels_export_dir().expect("labels export dir");
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_nanos())
            .unwrap_or(0);
        let file_name = format!("labels-test-{suffix}.pdf");
        let file_path = directory.join(&file_name);

        fs::write(&file_path, b"%PDF-1.4").expect("write test pdf");

        let wrong_path = directory
            .parent()
            .expect("parent dir")
            .join(&file_name)
            .to_string_lossy()
            .to_string();

        let resolved =
            resolve_pdf_path(&wrong_path, Some(&file_name)).expect("resolved path");

        assert_eq!(resolved, file_path);

        fs::remove_file(file_path).expect("cleanup test pdf");
    }
}