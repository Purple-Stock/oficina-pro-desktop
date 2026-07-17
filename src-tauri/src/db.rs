use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

const MIGRATION_SQL: &str = include_str!("../../src/db/migrations/001_init.sql");

fn optional_string(payload: &Value, key: &str) -> Option<String> {
    payload.get(key).and_then(|value| {
        if value.is_null() {
            None
        } else {
            value.as_str().map(str::to_string)
        }
    })
}

fn optional_f64(payload: &Value, key: &str) -> Option<f64> {
    payload.get(key).and_then(|value| {
        if value.is_null() {
            None
        } else {
            value.as_f64()
        }
    })
}

fn optional_custom_fields(payload: &Value) -> Option<String> {
    payload.get("customFields").and_then(|value| {
        if value.is_null() {
            None
        } else {
            Some(value.to_string())
        }
    })
}

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("oficina-pro.db"))
}

pub fn init_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    conn.execute_batch(MIGRATION_SQL)
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

fn team_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    let custom_field_schema_raw: Option<String> = row.get(5)?;
    let item_custom_field_schema = custom_field_schema_raw.and_then(|value| {
        serde_json::from_str::<Value>(&value).ok()
    });
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "name": row.get::<_, String>(1)?,
        "notes": row.get::<_, Option<String>>(2)?,
        "labelCompanyInfo": row.get::<_, Option<String>>(3)?,
        "labelLogoUrl": row.get::<_, Option<String>>(4)?,
        "itemCustomFieldSchema": item_custom_field_schema,
        "createdAt": row.get::<_, i64>(6)? * 1000,
        "updatedAt": row.get::<_, i64>(7)? * 1000,
        "itemCount": row.get::<_, i64>(8)?,
        "transactionCount": row.get::<_, i64>(9)?,
        "canDeleteTeam": true,
    }))
}

pub fn list_teams(conn: &Connection) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.notes, t.label_company_info, t.label_logo_url,
                    t.item_custom_field_schema, t.created_at, t.updated_at,
                    (SELECT COUNT(*) FROM items i WHERE i.team_id = t.id),
                    (SELECT COUNT(*) FROM stock_transactions st WHERE st.team_id = t.id)
             FROM teams t ORDER BY t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], team_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn get_team(conn: &Connection, team_id: i64) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.notes, t.label_company_info, t.label_logo_url,
                    t.item_custom_field_schema, t.created_at, t.updated_at,
                    (SELECT COUNT(*) FROM items i WHERE i.team_id = t.id),
                    (SELECT COUNT(*) FROM stock_transactions st WHERE st.team_id = t.id)
             FROM teams t WHERE t.id = ?",
        )
        .map_err(|e| e.to_string())?;
    let team = stmt
        .query_row(params![team_id], team_json)
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(team)
}

pub fn create_team(conn: &Connection, name: &str, notes: Option<&str>) -> Result<Value, String> {
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO teams (name, notes, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())",
        params![name, notes],
    )
    .map_err(|e| e.to_string())?;
    let team_id = tx.last_insert_rowid();
    tx.execute(
        "INSERT INTO locations (name, description, team_id, created_at, updated_at)
         VALUES ('Default Location', 'Default location for all items', ?, unixepoch(), unixepoch())",
        params![team_id],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    get_team(conn, team_id)?.ok_or_else(|| "Failed to load created team".to_string())
}

pub fn update_team(conn: &Connection, team_id: i64, payload: &Value) -> Result<Option<Value>, String> {
    if let Some(name) = payload.get("name").and_then(|value| value.as_str()).map(str::trim) {
        if name.is_empty() {
            return Err("Team name is required".to_string());
        }
        conn.execute(
            "UPDATE teams SET name = ?, updated_at = unixepoch() WHERE id = ?",
            params![name, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    if payload.get("notes").is_some() {
        let notes = optional_string(payload, "notes");
        conn.execute(
            "UPDATE teams SET notes = ?, updated_at = unixepoch() WHERE id = ?",
            params![notes, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    if payload.get("labelCompanyInfo").is_some() {
        let label_company_info = optional_string(payload, "labelCompanyInfo");
        conn.execute(
            "UPDATE teams SET label_company_info = ?, updated_at = unixepoch() WHERE id = ?",
            params![label_company_info, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    if payload.get("labelLogoUrl").is_some() {
        let label_logo_url = optional_string(payload, "labelLogoUrl");
        conn.execute(
            "UPDATE teams SET label_logo_url = ?, updated_at = unixepoch() WHERE id = ?",
            params![label_logo_url, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    if payload.get("itemCustomFieldSchema").is_some() {
        let schema = payload.get("itemCustomFieldSchema").map(|value| value.to_string());
        conn.execute(
            "UPDATE teams SET item_custom_field_schema = ?, updated_at = unixepoch() WHERE id = ?",
            params![schema, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    get_team(conn, team_id)
}

pub fn delete_team(conn: &Connection, team_id: i64) -> Result<bool, String> {
    let affected = conn
        .execute("DELETE FROM teams WHERE id = ?", params![team_id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

pub fn delete_all_data(conn: &Connection) -> Result<Value, String> {
    let deleted_teams: i64 = conn
        .query_row("SELECT COUNT(*) FROM teams", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM teams", [])
        .map_err(|e| e.to_string())?;

    Ok(json!({
        "deletedTeams": deleted_teams,
    }))
}

pub fn list_locations(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, description, team_id, created_at, updated_at FROM locations WHERE team_id = ? ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], |row| {
            Ok(json!({
                "id": row.get::<_, i64>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, Option<String>>(2)?,
                "teamId": row.get::<_, i64>(3)?,
                "createdAt": row.get::<_, i64>(4)? * 1000,
                "updatedAt": row.get::<_, i64>(5)? * 1000,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn update_location(
    conn: &Connection,
    team_id: i64,
    location_id: i64,
    name: Option<&str>,
    description: Option<Option<&str>>,
) -> Result<Option<Value>, String> {
    let exists: Option<i64> = conn
        .query_row(
            "SELECT id FROM locations WHERE id = ? AND team_id = ?",
            params![location_id, team_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if exists.is_none() {
        return Ok(None);
    }

    if let Some(name) = name {
        conn.execute(
            "UPDATE locations SET name = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![name, location_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(description) = description {
        conn.execute(
            "UPDATE locations SET description = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![description, location_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare("SELECT id, name, description, team_id, created_at, updated_at FROM locations WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![location_id], |row| {
        Ok(json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, String>(1)?,
            "description": row.get::<_, Option<String>>(2)?,
            "teamId": row.get::<_, i64>(3)?,
            "createdAt": row.get::<_, i64>(4)? * 1000,
            "updatedAt": row.get::<_, i64>(5)? * 1000,
        }))
    })
    .optional()
    .map_err(|e| e.to_string())
}

pub fn delete_location(conn: &Connection, team_id: i64, location_id: i64) -> Result<bool, String> {
    let affected = conn
        .execute(
            "DELETE FROM locations WHERE id = ? AND team_id = ?",
            params![location_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

pub fn create_location(
    conn: &Connection,
    team_id: i64,
    name: &str,
    description: Option<&str>,
) -> Result<Value, String> {
    conn.execute(
        "INSERT INTO locations (name, description, team_id, created_at, updated_at)
         VALUES (?, ?, ?, unixepoch(), unixepoch())",
        params![name, description, team_id],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT id, name, description, team_id, created_at, updated_at FROM locations WHERE id = ?")
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![id], |row| {
        Ok(json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, String>(1)?,
            "description": row.get::<_, Option<String>>(2)?,
            "teamId": row.get::<_, i64>(3)?,
            "createdAt": row.get::<_, i64>(4)? * 1000,
            "updatedAt": row.get::<_, i64>(5)? * 1000,
        }))
    })
    .map_err(|e| e.to_string())
}

pub fn get_item(conn: &Connection, team_id: i64, item_id: i64) -> Result<Option<Value>, String> {
    Ok(list_items(conn, team_id)?
        .into_iter()
        .find(|item| item.get("id").and_then(|v| v.as_i64()) == Some(item_id)))
}

pub fn list_items(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT i.id, i.name, i.sku, i.barcode, i.cost, i.price, i.item_type, i.brand, i.photo_data,
                    i.initial_quantity, i.current_stock, i.minimum_stock, i.custom_fields, i.team_id,
                    i.location_id, l.name, i.created_at, i.updated_at
             FROM items i
             LEFT JOIN locations l ON l.id = i.location_id
             WHERE i.team_id = ? ORDER BY i.name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], |row| {
            let custom_fields_raw: Option<String> = row.get(12)?;
            let custom_fields = custom_fields_raw.and_then(|value| {
                serde_json::from_str::<Value>(&value).ok()
            });
            Ok(json!({
                "id": row.get::<_, i64>(0)?,
                "name": row.get::<_, Option<String>>(1)?,
                "sku": row.get::<_, Option<String>>(2)?,
                "barcode": row.get::<_, Option<String>>(3)?,
                "cost": row.get::<_, Option<f64>>(4)?,
                "price": row.get::<_, Option<f64>>(5)?,
                "itemType": row.get::<_, Option<String>>(6)?,
                "brand": row.get::<_, Option<String>>(7)?,
                "photoData": row.get::<_, Option<String>>(8)?,
                "initialQuantity": row.get::<_, i64>(9)?,
                "currentStock": row.get::<_, f64>(10)?,
                "minimumStock": row.get::<_, f64>(11)?,
                "customFields": custom_fields,
                "teamId": row.get::<_, i64>(13)?,
                "locationId": row.get::<_, Option<i64>>(14)?,
                "locationName": row.get::<_, Option<String>>(15)?,
                "createdAt": row.get::<_, i64>(16)? * 1000,
                "updatedAt": row.get::<_, i64>(17)? * 1000,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn update_item(
    conn: &Connection,
    team_id: i64,
    item_id: i64,
    payload: &Value,
) -> Result<Option<Value>, String> {
    let exists: Option<i64> = conn
        .query_row(
            "SELECT id FROM items WHERE id = ? AND team_id = ?",
            params![item_id, team_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if exists.is_none() {
        return Ok(None);
    }

    if let Some(name) = payload.get("name").and_then(|v| v.as_str()) {
        conn.execute(
            "UPDATE items SET name = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![name, item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("sku").is_some() {
        conn.execute(
            "UPDATE items SET sku = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_string(payload, "sku"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(barcode) = payload.get("barcode").and_then(|v| v.as_str()) {
        conn.execute(
            "UPDATE items SET barcode = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![barcode, item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("cost").is_some() {
        conn.execute(
            "UPDATE items SET cost = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_f64(payload, "cost"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("price").is_some() {
        conn.execute(
            "UPDATE items SET price = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_f64(payload, "price"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("itemType").is_some() {
        conn.execute(
            "UPDATE items SET item_type = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_string(payload, "itemType"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("brand").is_some() {
        conn.execute(
            "UPDATE items SET brand = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_string(payload, "brand"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("photoData").is_some() {
        conn.execute(
            "UPDATE items SET photo_data = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_string(payload, "photoData"), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("customFields").is_some() {
        conn.execute(
            "UPDATE items SET custom_fields = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_custom_fields(payload), item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("minimumStock").is_some() {
        let minimum_stock = payload
            .get("minimumStock")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        conn.execute(
            "UPDATE items SET minimum_stock = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![minimum_stock, item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("locationId").is_some() {
        let location_id = payload.get("locationId").and_then(|v| v.as_i64());
        conn.execute(
            "UPDATE items SET location_id = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![location_id, item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }

    list_items(conn, team_id)?
        .into_iter()
        .find(|item| item.get("id").and_then(|v| v.as_i64()) == Some(item_id))
        .ok_or_else(|| "Failed to load updated item".to_string())
        .map(Some)
}

pub fn delete_item(conn: &Connection, team_id: i64, item_id: i64) -> Result<bool, String> {
    let affected = conn
        .execute(
            "DELETE FROM items WHERE id = ? AND team_id = ?",
            params![item_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

pub fn create_item(conn: &Connection, team_id: i64, payload: &Value) -> Result<Value, String> {
    let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let initial_quantity = payload
        .get("initialQuantity")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let location_id = payload.get("locationId").and_then(|v| v.as_i64());

    conn.execute(
        "INSERT INTO items (
            name, sku, barcode, cost, price, item_type, brand, photo_data,
            initial_quantity, current_stock, minimum_stock, custom_fields,
            team_id, location_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            name,
            optional_string(payload, "sku"),
            optional_string(payload, "barcode"),
            optional_f64(payload, "cost"),
            optional_f64(payload, "price"),
            optional_string(payload, "itemType"),
            optional_string(payload, "brand"),
            optional_string(payload, "photoData"),
            initial_quantity,
            initial_quantity,
            payload
                .get("minimumStock")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            optional_custom_fields(payload),
            team_id,
            location_id,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    list_items(conn, team_id)?
        .into_iter()
        .find(|item| item.get("id").and_then(|v| v.as_i64()) == Some(id))
        .ok_or_else(|| "Failed to load created item".to_string())
}

pub fn list_transactions(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT st.id, st.item_id, st.team_id, st.transaction_type, st.quantity, st.notes,
                    st.source_location_id, st.destination_location_id, st.destination_kind,
                    st.destination_label, st.created_at, st.updated_at, i.name
             FROM stock_transactions st
             LEFT JOIN items i ON i.id = st.item_id
             WHERE st.team_id = ? ORDER BY st.created_at DESC, st.id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], |row| {
            Ok(json!({
                "id": row.get::<_, i64>(0)?,
                "itemId": row.get::<_, i64>(1)?,
                "teamId": row.get::<_, i64>(2)?,
                "transactionType": row.get::<_, String>(3)?,
                "quantity": row.get::<_, f64>(4)?,
                "notes": row.get::<_, Option<String>>(5)?,
                "sourceLocationId": row.get::<_, Option<i64>>(6)?,
                "destinationLocationId": row.get::<_, Option<i64>>(7)?,
                "destinationKind": row.get::<_, Option<String>>(8)?,
                "destinationLabel": row.get::<_, Option<String>>(9)?,
                "createdAt": row.get::<_, i64>(10)? * 1000,
                "updatedAt": row.get::<_, i64>(11)? * 1000,
                "itemName": row.get::<_, Option<String>>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

fn days_to_civil(days: i64) -> (i32, u32, u32) {
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = (yoe as i32) + era as i32 * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (mp + if mp < 10 { 3 } else { -9 }) as u32;
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m, d)
}

fn unix_secs_to_date_string(secs: i64) -> String {
    let (year, month, day) = days_to_civil(secs / 86_400);
    format!("{year:04}-{month:02}-{day:02}")
}

fn transaction_matches_date_filter(
    created_at_ms: i64,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> bool {
    let date = unix_secs_to_date_string(created_at_ms / 1000);
    if let Some(start) = start_date.filter(|value| !value.trim().is_empty()) {
        if date.as_str() < start {
            return false;
        }
    }
    if let Some(end) = end_date.filter(|value| !value.trim().is_empty()) {
        if date.as_str() > end {
            return false;
        }
    }
    true
}

pub fn get_team_report_stats(
    conn: &Connection,
    team_id: i64,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> Result<Value, String> {
    let all_items = list_items(conn, team_id)?;
    let all_locations = list_locations(conn, team_id)?;
    let all_transactions = list_transactions(conn, team_id)?;

    let filtered_transactions: Vec<&Value> = all_transactions
        .iter()
        .filter(|transaction| {
            let created_at = transaction
                .get("createdAt")
                .and_then(|value| value.as_i64())
                .unwrap_or(0);
            transaction_matches_date_filter(created_at, start_date, end_date)
        })
        .collect();

    let total_stock_value: f64 = all_items.iter().fold(0.0, |sum, item| {
        let stock = item.get("currentStock").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        sum + stock * price
    });

    let low_stock_items = all_items
        .iter()
        .filter(|item| {
            let current = item.get("currentStock").and_then(|v| v.as_f64());
            let minimum = item.get("minimumStock").and_then(|v| v.as_f64());
            match (current, minimum) {
                (Some(current), Some(minimum)) => current > 0.0 && current <= minimum,
                _ => false,
            }
        })
        .count() as i64;

    let out_of_stock_items = all_items
        .iter()
        .filter(|item| {
            item.get("currentStock")
                .and_then(|v| v.as_f64())
                .map(|stock| stock <= 0.0)
                .unwrap_or(true)
        })
        .count() as i64;

    let mut transactions_by_type = json!({
        "stock_in": 0,
        "stock_out": 0,
        "adjust": 0,
        "move": 0,
    });

    for transaction in &filtered_transactions {
        if let Some(transaction_type) = transaction.get("transactionType").and_then(|v| v.as_str()) {
            if let Some(count) = transactions_by_type
                .get_mut(transaction_type)
                .and_then(|value| value.as_i64())
            {
                transactions_by_type[transaction_type] = json!(count + 1);
            }
        }
    }

    let recent_transactions: Vec<Value> = filtered_transactions
        .iter()
        .take(10)
        .map(|transaction| {
            json!({
                "id": transaction.get("id").cloned().unwrap_or(Value::Null),
                "transactionType": transaction.get("transactionType").cloned().unwrap_or(Value::Null),
                "quantity": transaction.get("quantity").cloned().unwrap_or(json!(0)),
                "createdAt": transaction.get("createdAt").cloned().unwrap_or(Value::Null),
                "itemName": transaction.get("itemName").cloned().unwrap_or(Value::Null),
            })
        })
        .collect();

    let mut top_items: Vec<Value> = all_items
        .iter()
        .map(|item| {
            let current_stock = item.get("currentStock").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
            json!({
                "id": item.get("id").cloned().unwrap_or(Value::Null),
                "name": item.get("name").cloned().unwrap_or(Value::Null),
                "sku": item.get("sku").cloned().unwrap_or(Value::Null),
                "currentStock": item.get("currentStock").cloned().unwrap_or(Value::Null),
                "price": item.get("price").cloned().unwrap_or(Value::Null),
                "totalValue": current_stock * price,
            })
        })
        .collect();

    top_items.sort_by(|left, right| {
        let left_value = left.get("totalValue").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let right_value = right.get("totalValue").and_then(|v| v.as_f64()).unwrap_or(0.0);
        right_value
            .partial_cmp(&left_value)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    top_items.truncate(10);

    let mut stock_by_location_map: std::collections::HashMap<
        Option<i64>,
        (Option<String>, i64, f64, f64),
    > = std::collections::HashMap::new();

    for item in &all_items {
        let location_id = item.get("locationId").and_then(|v| v.as_i64());
        let location_name = item
            .get("locationName")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let current_stock = item.get("currentStock").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let entry = stock_by_location_map
            .entry(location_id)
            .or_insert((location_name, 0, 0.0, 0.0));
        if entry.0.is_none() {
            entry.0 = item
                .get("locationName")
                .and_then(|v| v.as_str())
                .map(str::to_string);
        }
        entry.1 += 1;
        entry.2 += current_stock;
        entry.3 += current_stock * price;
    }

    let stock_by_location: Vec<Value> = stock_by_location_map
        .into_iter()
        .map(|(location_id, (location_name, item_count, total_stock, total_value))| {
            json!({
                "locationId": location_id,
                "locationName": location_name,
                "itemCount": item_count,
                "totalStock": total_stock,
                "totalValue": total_value,
            })
        })
        .collect();

    let thirty_days_ago_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64 - 30 * 86_400)
        .unwrap_or(0);

    let mut transactions_by_date_map: std::collections::BTreeMap<
        String,
        (i64, i64, i64, i64),
    > = std::collections::BTreeMap::new();

    for transaction in &all_transactions {
        let created_at_ms = transaction
            .get("createdAt")
            .and_then(|value| value.as_i64())
            .unwrap_or(0);
        if created_at_ms / 1000 < thirty_days_ago_secs {
            continue;
        }

        let date = unix_secs_to_date_string(created_at_ms / 1000);
        let entry = transactions_by_date_map
            .entry(date)
            .or_insert((0, 0, 0, 0));
        if let Some(transaction_type) = transaction.get("transactionType").and_then(|v| v.as_str()) {
            match transaction_type {
                "stock_in" => entry.0 += 1,
                "stock_out" => entry.1 += 1,
                "adjust" => entry.2 += 1,
                "move" => entry.3 += 1,
                _ => {}
            }
        }
    }

    let transactions_by_date: Vec<Value> = transactions_by_date_map
        .into_iter()
        .map(|(date, (stock_in, stock_out, adjust, move_count))| {
            json!({
                "date": date,
                "stock_in": stock_in,
                "stock_out": stock_out,
                "adjust": adjust,
                "move": move_count,
            })
        })
        .collect();

    Ok(json!({
        "totalItems": all_items.len() as i64,
        "totalLocations": all_locations.len() as i64,
        "totalTransactions": filtered_transactions.len() as i64,
        "totalStockValue": total_stock_value,
        "lowStockItems": low_stock_items,
        "outOfStockItems": out_of_stock_items,
        "transactionsByType": transactions_by_type,
        "recentTransactions": recent_transactions,
        "topItemsByValue": top_items,
        "stockByLocation": stock_by_location,
        "transactionsByDate": transactions_by_date,
    }))
}

pub fn build_team_snapshot(conn: &Connection, team_id: i64) -> Result<Value, String> {
    let team = get_team(conn, team_id)?
        .ok_or_else(|| "Team not found".to_string())?;
    let locations = list_locations(conn, team_id)?;
    let items = list_items(conn, team_id)?;
    let transactions = list_transactions(conn, team_id)?;

    Ok(json!({
        "team": team,
        "locations": locations,
        "items": items,
        "transactions": transactions,
    }))
}

pub fn build_full_backup(conn: &Connection) -> Result<Value, String> {
    let teams = list_teams(conn)?;
    let mut snapshots = Vec::new();

    for team in teams {
        let team_id = team
            .get("id")
            .and_then(|value| value.as_i64())
            .ok_or_else(|| "Invalid team id in database".to_string())?;
        snapshots.push(build_team_snapshot(conn, team_id)?);
    }

    Ok(json!({
        "version": 1,
        "app": "purple-stock-desktop",
        "exportType": "full",
        "exportedAt": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_secs())
            .unwrap_or(0),
        "teamCount": snapshots.len() as i64,
        "teams": snapshots,
    }))
}

fn resolve_import_payload_for_team(payload: &Value, team_id: i64) -> Result<Value, String> {
    if let Some(teams) = payload.get("teams").and_then(|value| value.as_array()) {
        for entry in teams {
            let entry_team_id = entry
                .get("team")
                .and_then(|team| team.get("id"))
                .and_then(|value| value.as_i64());
            if entry_team_id == Some(team_id) {
                return Ok(entry.clone());
            }
        }
        return Err("Current team was not found in the general JSON export".to_string());
    }

    if payload.get("team").is_some() {
        return Ok(payload.clone());
    }

    Err("Invalid backup format".to_string())
}

pub fn import_team_backup(
    conn: &Connection,
    team_id: i64,
    payload: &Value,
) -> Result<Value, String> {
    if get_team(conn, team_id)?.is_none() {
        return Err("Team not found".to_string());
    }

    let import_payload = resolve_import_payload_for_team(payload, team_id)?;

    let mut imported_locations = 0_i64;
    let mut skipped_locations = 0_i64;
    let mut imported_items = 0_i64;
    let mut skipped_items = 0_i64;
    let mut updated_team_settings = false;

    if let Some(team_payload) = import_payload.get("team").and_then(|value| value.as_object()) {
        let mut settings = json!({});
        if let Some(value) = team_payload.get("notes") {
            settings["notes"] = value.clone();
        }
        if let Some(value) = team_payload.get("labelCompanyInfo") {
            settings["labelCompanyInfo"] = value.clone();
        }
        if let Some(value) = team_payload.get("labelLogoUrl") {
            settings["labelLogoUrl"] = value.clone();
        }
        if let Some(value) = team_payload.get("itemCustomFieldSchema") {
            settings["itemCustomFieldSchema"] = value.clone();
        }
        if settings.as_object().map(|obj| !obj.is_empty()).unwrap_or(false) {
            update_team(conn, team_id, &settings)?;
            updated_team_settings = true;
        }
    }

    let mut location_ids_by_name = list_locations(conn, team_id)?
        .into_iter()
        .filter_map(|location| {
            let name = location.get("name")?.as_str()?.to_string();
            let id = location.get("id")?.as_i64()?;
            Some((normalize_csv_header(&name), id))
        })
        .collect::<std::collections::HashMap<String, i64>>();

    if let Some(locations) = import_payload.get("locations").and_then(|value| value.as_array()) {
        for location in locations {
            let name = location
                .get("name")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let Some(name) = name else {
                skipped_locations += 1;
                continue;
            };
            if location_ids_by_name.contains_key(&normalize_csv_header(name)) {
                skipped_locations += 1;
                continue;
            }
            let description = location
                .get("description")
                .and_then(|value| value.as_str());
            let created = create_location(conn, team_id, name, description)?;
            if let Some(id) = created.get("id").and_then(|value| value.as_i64()) {
                location_ids_by_name.insert(normalize_csv_header(name), id);
                imported_locations += 1;
            }
        }
    }

    let existing_barcodes = list_items(conn, team_id)?
        .into_iter()
        .filter_map(|item| {
            item.get("barcode")
                .and_then(|value| value.as_str())
                .map(str::to_string)
        })
        .collect::<std::collections::HashSet<String>>();

    if let Some(items) = import_payload.get("items").and_then(|value| value.as_array()) {
        for item in items {
            let barcode = item
                .get("barcode")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let name = item
                .get("name")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let (Some(barcode), Some(name)) = (barcode, name) else {
                skipped_items += 1;
                continue;
            };
            if existing_barcodes.contains(barcode) {
                skipped_items += 1;
                continue;
            }

            let location_name = item
                .get("locationName")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let location_id = location_name
                .and_then(|value| location_ids_by_name.get(&normalize_csv_header(value)).copied());

            let stock = item
                .get("currentStock")
                .and_then(|value| value.as_f64())
                .or_else(|| item.get("initialQuantity").and_then(|value| value.as_f64()))
                .unwrap_or(0.0);

            let item_payload = json!({
                "name": name,
                "sku": item.get("sku").cloned().unwrap_or(Value::Null),
                "barcode": barcode,
                "cost": item.get("cost").cloned().unwrap_or(Value::Null),
                "price": item.get("price").cloned().unwrap_or(Value::Null),
                "itemType": item.get("itemType").cloned().unwrap_or(Value::Null),
                "brand": item.get("brand").cloned().unwrap_or(Value::Null),
                "photoData": item.get("photoData").cloned().unwrap_or(Value::Null),
                "initialQuantity": stock,
                "currentStock": stock,
                "minimumStock": item.get("minimumStock").cloned().unwrap_or(json!(0)),
                "customFields": item.get("customFields").cloned().unwrap_or(Value::Null),
                "locationId": location_id,
            });

            create_item(conn, team_id, &item_payload)?;
            imported_items += 1;
        }
    }

    Ok(json!({
        "importedLocations": imported_locations,
        "skippedLocations": skipped_locations,
        "importedItems": imported_items,
        "skippedItems": skipped_items,
        "updatedTeamSettings": updated_team_settings,
    }))
}

fn normalize_csv_header(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|character| match character {
            'á' | 'à' | 'â' | 'ã' | 'ä' => 'a',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' => 'i',
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' => 'o',
            'ú' | 'ù' | 'û' | 'ü' => 'u',
            'ç' => 'c',
            'ñ' => 'n',
            character if character.is_ascii_alphanumeric() => character,
            _ => ' ',
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<String>()
}

fn parse_csv(input: &str) -> Vec<Vec<String>> {
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut current_field = String::new();
    let mut in_quotes = false;
    let chars: Vec<char> = input.chars().collect();
    let mut index = 0;

    while index < chars.len() {
        let character = chars[index];
        let next = chars.get(index + 1).copied();

        if in_quotes {
            if character == '"' {
                if next == Some('"') {
                    current_field.push('"');
                    index += 1;
                } else {
                    in_quotes = false;
                }
            } else {
                current_field.push(character);
            }
            index += 1;
            continue;
        }

        if character == '"' {
            in_quotes = true;
            index += 1;
            continue;
        }

        if character == ',' {
            current_row.push(current_field.clone());
            current_field.clear();
            index += 1;
            continue;
        }

        if character == '\n' {
            current_row.push(current_field.clone());
            rows.push(current_row);
            current_row = Vec::new();
            current_field.clear();
            index += 1;
            continue;
        }

        if character != '\r' {
            current_field.push(character);
        }
        index += 1;
    }

    current_row.push(current_field);
    rows.push(current_row);

    rows.into_iter()
        .filter(|row| row.len() > 1 || row.first().map(|value| !value.trim().is_empty()).unwrap_or(false))
        .collect()
}

fn map_csv_header_indexes(headers: &[String]) -> std::collections::HashMap<String, usize> {
    let aliases: [(&str, &[&str]); 7] = [
        ("name", &["name", "nome", "nom"]),
        ("sku", &["sku"]),
        (
            "barcode",
            &["barcode", "codigodebarras", "codebarres"],
        ),
        ("type", &["type", "tipo"]),
        ("stock", &["stock", "estoque"]),
        ("price", &["price", "preco", "preço", "prix"]),
        ("location", &["location", "localizacao", "localização", "emplacement"]),
    ];

    let normalized_headers = headers
        .iter()
        .map(|header| normalize_csv_header(header))
        .collect::<Vec<_>>();
    let mut header_indexes = std::collections::HashMap::new();

    for (canonical_key, alias_list) in aliases {
        if let Some(index) = normalized_headers
            .iter()
            .position(|header| alias_list.iter().any(|alias| alias == header))
        {
            header_indexes.insert(canonical_key.to_string(), index);
        }
    }

    header_indexes
}

fn get_csv_cell(row: &[String], header_indexes: &std::collections::HashMap<String, usize>, key: &str) -> String {
    header_indexes
        .get(key)
        .and_then(|index| row.get(*index))
        .map(|value| value.trim().to_string())
        .unwrap_or_default()
}

pub fn preview_team_items_csv(
    conn: &Connection,
    team_id: i64,
    csv_content: &str,
) -> Result<Value, String> {
    let parsed_rows = parse_csv(csv_content);
    if parsed_rows.is_empty() {
        return Err("CSV file is empty".to_string());
    }

    let headers = parsed_rows[0].clone();
    let data_rows = &parsed_rows[1..];
    let header_indexes = map_csv_header_indexes(&headers);

    for required in ["name", "barcode"] {
        if !header_indexes.contains_key(required) {
            return Err(format!("Missing required CSV header: {required}"));
        }
    }

    let locations_by_name = list_locations(conn, team_id)?
        .into_iter()
        .filter_map(|location| {
            let name = location.get("name")?.as_str()?.to_string();
            let id = location.get("id")?.as_i64()?;
            Some((normalize_csv_header(&name), id))
        })
        .collect::<std::collections::HashMap<String, i64>>();

    let mut rows = Vec::new();
    for (index, row) in data_rows.iter().enumerate() {
        let line = (index + 2) as i64;
        let raw_name = get_csv_cell(row, &header_indexes, "name");
        let raw_barcode = get_csv_cell(row, &header_indexes, "barcode");
        let raw_stock = get_csv_cell(row, &header_indexes, "stock");
        let raw_price = get_csv_cell(row, &header_indexes, "price");
        let raw_location = get_csv_cell(row, &header_indexes, "location");
        let location_id = if raw_location.is_empty() {
            None
        } else {
            locations_by_name.get(&normalize_csv_header(&raw_location)).copied()
        };

        let mut errors = Vec::new();
        if raw_name.is_empty() {
            errors.push("Item name is required".to_string());
        }
        if raw_barcode.is_empty() {
            errors.push("Barcode is required".to_string());
        }
        if !raw_stock.is_empty() && raw_stock.parse::<f64>().is_err() {
            errors.push("Current stock must be a valid number".to_string());
        }
        if !raw_price.is_empty() && raw_price.parse::<f64>().is_err() {
            errors.push("Price must be a valid number".to_string());
        }
        if !raw_location.is_empty() && location_id.is_none() {
            errors.push(format!(
                "Location \"{raw_location}\" was not found for this team"
            ));
        }

        let status = if errors.is_empty() { "valid" } else { "invalid" };
        let item = if errors.is_empty() {
            Some(json!({
                "name": raw_name,
                "sku": get_csv_cell(row, &header_indexes, "sku"),
                "barcode": raw_barcode,
                "itemType": get_csv_cell(row, &header_indexes, "type"),
                "currentStock": raw_stock.parse::<f64>().unwrap_or(0.0),
                "initialQuantity": raw_stock.parse::<f64>().unwrap_or(0.0),
                "price": if raw_price.is_empty() { Value::Null } else { json!(raw_price.parse::<f64>().unwrap_or(0.0)) },
                "locationId": location_id,
            }))
        } else {
            None
        };

        rows.push(json!({
            "line": line,
            "status": status,
            "item": item,
            "errors": errors,
        }));
    }

    let valid_rows = rows
        .iter()
        .filter(|row| row.get("status").and_then(|value| value.as_str()) == Some("valid"))
        .count() as i64;

    Ok(json!({
        "summary": {
            "totalRows": rows.len() as i64,
            "validRows": valid_rows,
            "invalidRows": rows.len() as i64 - valid_rows,
        },
        "rows": rows,
    }))
}

pub fn import_team_items_csv(
    conn: &Connection,
    team_id: i64,
    csv_content: &str,
) -> Result<Value, String> {
    let preview = preview_team_items_csv(conn, team_id, csv_content)?;
    let invalid_rows = preview
        .get("summary")
        .and_then(|value| value.get("invalidRows"))
        .and_then(|value| value.as_i64())
        .unwrap_or(0);
    if invalid_rows > 0 {
        return Err(format!(
            "CSV import contains {invalid_rows} invalid rows. Fix the preview errors and try again."
        ));
    }

    let rows = preview
        .get("rows")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let total_rows = rows.len() as i64;
    let mut imported_rows = 0_i64;
    for row in rows {
        if row.get("status").and_then(|value| value.as_str()) != Some("valid") {
            continue;
        }
        let Some(item) = row.get("item") else {
            continue;
        };
        let payload = json!({
            "name": item.get("name").cloned().unwrap_or(Value::Null),
            "sku": item.get("sku").cloned().unwrap_or(Value::Null),
            "barcode": item.get("barcode").cloned().unwrap_or(Value::Null),
            "itemType": item.get("itemType").cloned().unwrap_or(Value::Null),
            "initialQuantity": item.get("initialQuantity").cloned().unwrap_or(json!(0)),
            "currentStock": item.get("currentStock").cloned().unwrap_or(json!(0)),
            "price": item.get("price").cloned().unwrap_or(Value::Null),
            "locationId": item.get("locationId").cloned().unwrap_or(Value::Null),
        });
        create_item(conn, team_id, &payload)?;
        imported_rows += 1;
    }

    Ok(json!({
        "summary": {
            "totalRows": total_rows,
            "importedRows": imported_rows,
            "rejectedRows": total_rows - imported_rows,
        }
    }))
}

pub fn create_stock_transaction(
    conn: &Connection,
    team_id: i64,
    payload: &Value,
) -> Result<Value, String> {
    let item_id = payload
        .get("itemId")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| "Item is required".to_string())?;
    let transaction_type = payload
        .get("transactionType")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Transaction type is required".to_string())?;
    let quantity = payload
        .get("quantity")
        .and_then(|v| v.as_f64())
        .ok_or_else(|| "Quantity is required".to_string())?;
    let notes = payload.get("notes").and_then(|v| v.as_str());
    let source_location_id = payload
        .get("sourceLocationId")
        .and_then(|v| v.as_i64());
    let destination_location_id = payload
        .get("destinationLocationId")
        .and_then(|v| v.as_i64());

    if transaction_type == "move" && destination_location_id.is_none() {
        return Err("Destination location is required for move".to_string());
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let (current_stock, location_id): (f64, Option<i64>) = tx
        .query_row(
            "SELECT current_stock, location_id FROM items WHERE id = ? AND team_id = ?",
            params![item_id, team_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Item not found for team".to_string())?;

    let mut new_stock = current_stock;
    let mut new_location_id = location_id;

    match transaction_type {
        "stock_in" => new_stock += quantity,
        "stock_out" => {
            if current_stock < quantity {
                return Err("Insufficient stock for stock out".to_string());
            }
            new_stock -= quantity;
        }
        "adjust" | "count" => new_stock = quantity,
        "move" => {}
        _ => return Err("Invalid transaction type".to_string()),
    }

    let resolved_source = source_location_id.or(location_id);
    if let Some(dest) = destination_location_id {
        new_location_id = Some(dest);
    }

    tx.execute(
        "INSERT INTO stock_transactions (
            item_id, team_id, transaction_type, quantity, notes,
            source_location_id, destination_location_id,
            created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            item_id,
            team_id,
            transaction_type,
            quantity,
            notes,
            resolved_source,
            destination_location_id
        ],
    )
    .map_err(|e| e.to_string())?;
    let tx_id = tx.last_insert_rowid();

    tx.execute(
        "UPDATE items SET current_stock = ?, location_id = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
        params![new_stock.max(0.0), new_location_id, item_id, team_id],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    list_transactions(conn, team_id)?
        .into_iter()
        .find(|entry| entry.get("id").and_then(|v| v.as_i64()) == Some(tx_id))
        .ok_or_else(|| "Failed to load created transaction".to_string())
}

#[cfg(test)]
pub fn init_test_connection() -> Result<Connection, String> {
    let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    conn.execute_batch(MIGRATION_SQL)
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn production_sqlite_supports_team_item_location_crud_and_move() {
        let conn = init_test_connection().expect("test db");
        let team = create_team(&conn, "Ops", Some("notes")).expect("create team");
        let team_id = team.get("id").and_then(|v| v.as_i64()).expect("team id");

        let locations = list_locations(&conn, team_id).expect("list locations");
        let default_location_id = locations[0]
            .get("id")
            .and_then(|v| v.as_i64())
            .expect("default location");

        let shelf = create_location(&conn, team_id, "Shelf 1", None).expect("create location");
        let shelf_id = shelf.get("id").and_then(|v| v.as_i64()).expect("shelf id");

        let updated_location = update_location(
            &conn,
            team_id,
            shelf_id,
            Some("Shelf A"),
            Some(Some("Aisle")),
        )
        .expect("update location")
        .expect("updated location row");
        assert_eq!(
            updated_location.get("name").and_then(|v| v.as_str()),
            Some("Shelf A")
        );

        let item = create_item(
            &conn,
            team_id,
            &json!({
                "name": "Widget",
                "barcode": "1234567890123",
                "sku": "WIDGET-001",
                "initialQuantity": 10,
                "locationId": default_location_id
            }),
        )
        .expect("create item");
        let item_id = item.get("id").and_then(|v| v.as_i64()).expect("item id");
        assert_eq!(
            item.get("barcode").and_then(|v| v.as_str()),
            Some("1234567890123")
        );

        let updated_item = update_item(
            &conn,
            team_id,
            item_id,
            &json!({ "name": "Widget Pro", "minimumStock": 2.0 }),
        )
        .expect("update item")
        .expect("updated item row");
        assert_eq!(
            updated_item.get("name").and_then(|v| v.as_str()),
            Some("Widget Pro")
        );

        let move_tx = create_stock_transaction(
            &conn,
            team_id,
            &json!({
                "itemId": item_id,
                "transactionType": "move",
                "quantity": 0,
                "sourceLocationId": default_location_id,
                "destinationLocationId": shelf_id
            }),
        )
        .expect("move transaction");

        assert_eq!(
            move_tx
                .get("destinationLocationId")
                .and_then(|v| v.as_i64()),
            Some(shelf_id)
        );

        let items_after_move = list_items(&conn, team_id).expect("list items");
        let moved_item = items_after_move
            .iter()
            .find(|entry| entry.get("id").and_then(|v| v.as_i64()) == Some(item_id))
            .expect("moved item");
        assert_eq!(
            moved_item.get("locationId").and_then(|v| v.as_i64()),
            Some(shelf_id)
        );

        let stock_in = create_stock_transaction(
            &conn,
            team_id,
            &json!({
                "itemId": item_id,
                "transactionType": "stock_in",
                "quantity": 5
            }),
        )
        .expect("stock in");

        assert_eq!(
            stock_in.get("transactionType").and_then(|v| v.as_str()),
            Some("stock_in")
        );

        let report_stats = get_team_report_stats(&conn, team_id, None, None).expect("report stats");
        assert_eq!(
            report_stats.get("totalItems").and_then(|v| v.as_i64()),
            Some(1)
        );
        assert_eq!(
            report_stats.get("totalTransactions").and_then(|v| v.as_i64()),
            Some(2)
        );
        assert!(
            report_stats
                .get("recentTransactions")
                .and_then(|v| v.as_array())
                .map(|entries| !entries.is_empty())
                .unwrap_or(false)
        );

        assert!(delete_item(&conn, team_id, item_id).expect("delete item"));
        assert!(delete_location(&conn, team_id, shelf_id).expect("delete location"));
        assert!(delete_team(&conn, team_id).expect("delete team"));
    }
}