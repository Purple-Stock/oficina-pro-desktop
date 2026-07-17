use crate::db::DbState;
use serde_json::{json, Value};
use tauri::State;

fn ok<T: serde::Serialize>(data: T) -> Value {
    json!({ "ok": true, "data": data })
}

fn err(code: &str, message: &str) -> Value {
    json!({
        "ok": false,
        "error": { "code": code, "message": message }
    })
}

#[tauri::command]
pub fn init_database(state: State<'_, DbState>) -> Result<(), String> {
    let _guard = state.conn.lock().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_teams(state: State<'_, DbState>) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let teams = crate::db::list_teams(&conn)?;
    Ok(ok(json!({ "teams": teams })))
}

#[tauri::command]
pub fn get_team(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::get_team(&conn, team_id)? {
        Some(team) => Ok(ok(json!({ "team": team }))),
        None => Ok(err("NOT_FOUND", "Team not found")),
    }
}

#[tauri::command]
pub fn create_team(state: State<'_, DbState>, payload: Value) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Team name is required".to_string())?;
    let notes = payload.get("notes").and_then(|v| v.as_str());
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let team = crate::db::create_team(&conn, name, notes)?;
    Ok(ok(json!({ "team": team })))
}

#[tauri::command]
pub fn update_team(state: State<'_, DbState>, team_id: i64, payload: Value) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::update_team(&conn, team_id, &payload) {
        Ok(Some(team)) => Ok(ok(json!({ "team": team }))),
        Ok(None) => Ok(err("NOT_FOUND", "Team not found")),
        Err(message) => Ok(err("VALIDATION_ERROR", &message)),
    }
}

#[tauri::command]
pub fn delete_team(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::db::delete_team(&conn, team_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Team not found"))
    }
}

#[tauri::command]
pub fn list_team_items(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let items = crate::db::list_items(&conn, team_id)?;
    Ok(ok(json!({ "items": items })))
}

#[tauri::command]
pub fn get_team_item(
    state: State<'_, DbState>,
    team_id: i64,
    item_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::get_item(&conn, team_id, item_id)? {
        Some(item) => Ok(ok(json!({ "item": item }))),
        None => Ok(err("NOT_FOUND", "Item not found")),
    }
}

#[tauri::command]
pub fn create_team_item(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Item name is required".to_string())?;
    let mut data = payload.clone();
    if let Some(obj) = data.as_object_mut() {
        obj.insert("name".to_string(), json!(name));
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let item = crate::db::create_item(&conn, team_id, &data)?;
    Ok(ok(json!({ "item": item })))
}

#[tauri::command]
pub fn list_team_locations(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let locations = crate::db::list_locations(&conn, team_id)?;
    Ok(ok(json!({ "locations": locations })))
}

#[tauri::command]
pub fn create_team_location(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Location name is required".to_string())?;
    let description = payload.get("description").and_then(|v| v.as_str());
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let location = crate::db::create_location(&conn, team_id, name, description)?;
    Ok(ok(json!({ "location": location })))
}

#[tauri::command]
pub fn list_team_transactions(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let transactions = crate::db::list_transactions(&conn, team_id)?;
    Ok(ok(json!({ "transactions": transactions })))
}

#[tauri::command]
pub fn update_team_item(
    state: State<'_, DbState>,
    team_id: i64,
    item_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::update_item(&conn, team_id, item_id, &payload)? {
        Some(item) => Ok(ok(json!({ "item": item }))),
        None => Ok(err("NOT_FOUND", "Item not found")),
    }
}

#[tauri::command]
pub fn delete_team_item(
    state: State<'_, DbState>,
    team_id: i64,
    item_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::db::delete_item(&conn, team_id, item_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Item not found"))
    }
}

#[tauri::command]
pub fn update_team_location(
    state: State<'_, DbState>,
    team_id: i64,
    location_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let name = payload.get("name").and_then(|v| v.as_str()).map(str::trim);
    let description = payload.get("description").and_then(|v| v.as_str());
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::update_location(
        &conn,
        team_id,
        location_id,
        name,
        if payload.get("description").is_some() {
            Some(description)
        } else {
            None
        },
    )? {
        Some(location) => Ok(ok(json!({ "location": location }))),
        None => Ok(err("NOT_FOUND", "Location not found")),
    }
}

#[tauri::command]
pub fn delete_team_location(
    state: State<'_, DbState>,
    team_id: i64,
    location_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::db::delete_location(&conn, team_id, location_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Location not found"))
    }
}

#[tauri::command]
pub fn get_team_report_stats(
    state: State<'_, DbState>,
    team_id: i64,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let stats = crate::db::get_team_report_stats(
        &conn,
        team_id,
        start_date.as_deref(),
        end_date.as_deref(),
    )?;
    Ok(ok(json!({ "stats": stats })))
}

#[tauri::command]
pub fn create_team_stock_transaction(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::db::create_stock_transaction(&conn, team_id, &payload) {
        Ok(transaction) => Ok(ok(json!({ "transaction": transaction }))),
        Err(message)
            if message.contains("Insufficient stock")
                || message.contains("Destination location is required") =>
        {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}
#[tauri::command]
pub fn list_team_clients(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let clients = crate::oficina::list_clients(&conn, team_id)?;
    Ok(ok(json!({ "clients": clients })))
}

#[tauri::command]
pub fn create_team_client(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::create_client(&conn, team_id, &payload) {
        Ok(client) => Ok(ok(json!({ "client": client }))),
        Err(message) if message.contains("required") => Ok(err("VALIDATION_ERROR", &message)),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn update_team_client(
    state: State<'_, DbState>,
    team_id: i64,
    client_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::update_client(&conn, team_id, client_id, &payload) {
        Ok(Some(client)) => Ok(ok(json!({ "client": client }))),
        Ok(None) => Ok(err("NOT_FOUND", "Client not found")),
        Err(message) if message.contains("required") => Ok(err("VALIDATION_ERROR", &message)),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn delete_team_client(
    state: State<'_, DbState>,
    team_id: i64,
    client_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::oficina::delete_client(&conn, team_id, client_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Client not found"))
    }
}

#[tauri::command]
pub fn list_team_vehicles(state: State<'_, DbState>, team_id: i64) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let vehicles = crate::oficina::list_vehicles(&conn, team_id)?;
    Ok(ok(json!({ "vehicles": vehicles })))
}

#[tauri::command]
pub fn create_team_vehicle(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::create_vehicle(&conn, team_id, &payload) {
        Ok(vehicle) => Ok(ok(json!({ "vehicle": vehicle }))),
        Err(message)
            if message.contains("required")
                || message.contains("exists")
                || message.contains("not found") =>
        {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn update_team_vehicle(
    state: State<'_, DbState>,
    team_id: i64,
    vehicle_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::update_vehicle(&conn, team_id, vehicle_id, &payload) {
        Ok(Some(vehicle)) => Ok(ok(json!({ "vehicle": vehicle }))),
        Ok(None) => Ok(err("NOT_FOUND", "Vehicle not found")),
        Err(message) if message.contains("required") || message.contains("not found") => {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn delete_team_vehicle(
    state: State<'_, DbState>,
    team_id: i64,
    vehicle_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::oficina::delete_vehicle(&conn, team_id, vehicle_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Vehicle not found"))
    }
}

#[tauri::command]
pub fn list_team_workshop_services(
    state: State<'_, DbState>,
    team_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let services = crate::oficina::list_services(&conn, team_id)?;
    Ok(ok(json!({ "services": services })))
}

#[tauri::command]
pub fn create_team_workshop_service(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::create_service(&conn, team_id, &payload) {
        Ok(service) => Ok(ok(json!({ "service": service }))),
        Err(message) if message.contains("required") => Ok(err("VALIDATION_ERROR", &message)),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn update_team_workshop_service(
    state: State<'_, DbState>,
    team_id: i64,
    service_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::update_service(&conn, team_id, service_id, &payload) {
        Ok(Some(service)) => Ok(ok(json!({ "service": service }))),
        Ok(None) => Ok(err("NOT_FOUND", "Service not found")),
        Err(message) if message.contains("required") => Ok(err("VALIDATION_ERROR", &message)),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn delete_team_workshop_service(
    state: State<'_, DbState>,
    team_id: i64,
    service_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if crate::oficina::delete_service(&conn, team_id, service_id)? {
        Ok(ok(Value::Null))
    } else {
        Ok(err("NOT_FOUND", "Service not found"))
    }
}

#[tauri::command]
pub fn list_team_service_orders(
    state: State<'_, DbState>,
    team_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service_orders = crate::oficina::list_service_orders(&conn, team_id)?;
    Ok(ok(json!({ "serviceOrders": service_orders })))
}

#[tauri::command]
pub fn get_team_service_order(
    state: State<'_, DbState>,
    team_id: i64,
    order_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::get_service_order(&conn, team_id, order_id)? {
        Some(service_order) => Ok(ok(json!({ "serviceOrder": service_order }))),
        None => Ok(err("NOT_FOUND", "Service order not found")),
    }
}

#[tauri::command]
pub fn create_team_service_order(
    state: State<'_, DbState>,
    team_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::create_service_order(&conn, team_id, &payload) {
        Ok(service_order) => Ok(ok(json!({ "serviceOrder": service_order }))),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn update_team_service_order(
    state: State<'_, DbState>,
    team_id: i64,
    order_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::update_service_order(&conn, team_id, order_id, &payload) {
        Ok(Some(service_order)) => Ok(ok(json!({ "serviceOrder": service_order }))),
        Ok(None) => Ok(err("NOT_FOUND", "Service order not found")),
        Err(message)
            if message.contains("Insufficient")
                || message.contains("reopened")
                || message.contains("closed") =>
        {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn add_team_service_order_item(
    state: State<'_, DbState>,
    team_id: i64,
    order_id: i64,
    payload: Value,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::add_service_order_item(&conn, team_id, order_id, &payload) {
        Ok(item) => Ok(ok(json!({ "item": item }))),
        Err(message)
            if message.contains("required")
                || message.contains("closed")
                || message.contains("kind")
                || message.contains("not found") =>
        {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn remove_team_service_order_item(
    state: State<'_, DbState>,
    team_id: i64,
    order_id: i64,
    item_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::remove_service_order_item(&conn, team_id, order_id, item_id) {
        Ok(true) => Ok(ok(Value::Null)),
        Ok(false) => Ok(err("NOT_FOUND", "Line item not found")),
        Err(message) if message.contains("closed") || message.contains("not found") => {
            Ok(err("VALIDATION_ERROR", &message))
        }
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}

#[tauri::command]
pub fn delete_team_service_order(
    state: State<'_, DbState>,
    team_id: i64,
    order_id: i64,
) -> Result<Value, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match crate::oficina::delete_service_order(&conn, team_id, order_id) {
        Ok(true) => Ok(ok(Value::Null)),
        Ok(false) => Ok(err("NOT_FOUND", "Service order not found")),
        Err(message) if message.contains("stock") => Ok(err("VALIDATION_ERROR", &message)),
        Err(message) => Ok(err("INTERNAL_ERROR", &message)),
    }
}
