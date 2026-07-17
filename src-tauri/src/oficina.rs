use crate::db;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};

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

fn optional_i64(payload: &Value, key: &str) -> Option<i64> {
    payload.get(key).and_then(|value| {
        if value.is_null() {
            None
        } else {
            value.as_i64().or_else(|| value.as_f64().map(|n| n as i64))
        }
    })
}

fn client_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "teamId": row.get::<_, i64>(1)?,
        "name": row.get::<_, String>(2)?,
        "phone": row.get::<_, Option<String>>(3)?,
        "email": row.get::<_, Option<String>>(4)?,
        "document": row.get::<_, Option<String>>(5)?,
        "notes": row.get::<_, Option<String>>(6)?,
        "createdAt": row.get::<_, i64>(7)? * 1000,
        "updatedAt": row.get::<_, i64>(8)? * 1000,
        "vehicleCount": row.get::<_, i64>(9)?,
    }))
}

pub fn list_clients(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.team_id, c.name, c.phone, c.email, c.document, c.notes,
                    c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id)
             FROM clients c WHERE c.team_id = ? ORDER BY c.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], client_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn get_client(conn: &Connection, team_id: i64, client_id: i64) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.team_id, c.name, c.phone, c.email, c.document, c.notes,
                    c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id)
             FROM clients c WHERE c.id = ? AND c.team_id = ?",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![client_id, team_id], client_json)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn create_client(conn: &Connection, team_id: i64, payload: &Value) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Client name is required".to_string())?;
    conn.execute(
        "INSERT INTO clients (team_id, name, phone, email, document, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            team_id,
            name,
            optional_string(payload, "phone"),
            optional_string(payload, "email"),
            optional_string(payload, "document"),
            optional_string(payload, "notes"),
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    get_client(conn, team_id, id)?.ok_or_else(|| "Failed to load created client".to_string())
}

pub fn update_client(
    conn: &Connection,
    team_id: i64,
    client_id: i64,
    payload: &Value,
) -> Result<Option<Value>, String> {
    if get_client(conn, team_id, client_id)?.is_none() {
        return Ok(None);
    }
    if let Some(name) = payload.get("name").and_then(|v| v.as_str()).map(str::trim) {
        if name.is_empty() {
            return Err("Client name is required".to_string());
        }
        conn.execute(
            "UPDATE clients SET name = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![name, client_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    for key in ["phone", "email", "document", "notes"] {
        if payload.get(key).is_some() {
            let value = optional_string(payload, key);
            conn.execute(
                &format!(
                    "UPDATE clients SET {} = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
                    key
                ),
                params![value, client_id, team_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    get_client(conn, team_id, client_id)
}

pub fn delete_client(conn: &Connection, team_id: i64, client_id: i64) -> Result<bool, String> {
    let changed = conn
        .execute(
            "DELETE FROM clients WHERE id = ? AND team_id = ?",
            params![client_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed > 0)
}

fn vehicle_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "teamId": row.get::<_, i64>(1)?,
        "clientId": row.get::<_, i64>(2)?,
        "plate": row.get::<_, String>(3)?,
        "brand": row.get::<_, Option<String>>(4)?,
        "model": row.get::<_, Option<String>>(5)?,
        "year": row.get::<_, Option<i64>>(6)?,
        "color": row.get::<_, Option<String>>(7)?,
        "odometer": row.get::<_, Option<f64>>(8)?,
        "notes": row.get::<_, Option<String>>(9)?,
        "createdAt": row.get::<_, i64>(10)? * 1000,
        "updatedAt": row.get::<_, i64>(11)? * 1000,
        "clientName": row.get::<_, Option<String>>(12)?,
    }))
}

pub fn list_vehicles(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT v.id, v.team_id, v.client_id, v.plate, v.brand, v.model, v.year, v.color,
                    v.odometer, v.notes, v.created_at, v.updated_at, c.name
             FROM vehicles v
             LEFT JOIN clients c ON c.id = v.client_id
             WHERE v.team_id = ? ORDER BY v.plate ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], vehicle_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn get_vehicle(
    conn: &Connection,
    team_id: i64,
    vehicle_id: i64,
) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT v.id, v.team_id, v.client_id, v.plate, v.brand, v.model, v.year, v.color,
                    v.odometer, v.notes, v.created_at, v.updated_at, c.name
             FROM vehicles v
             LEFT JOIN clients c ON c.id = v.client_id
             WHERE v.id = ? AND v.team_id = ?",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![vehicle_id, team_id], vehicle_json)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn create_vehicle(conn: &Connection, team_id: i64, payload: &Value) -> Result<Value, String> {
    let plate = payload
        .get("plate")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_uppercase())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Vehicle plate is required".to_string())?;
    let client_id = optional_i64(payload, "clientId").ok_or_else(|| "Client is required".to_string())?;
    if get_client(conn, team_id, client_id)?.is_none() {
        return Err("Client not found".to_string());
    }
    conn.execute(
        "INSERT INTO vehicles (
            team_id, client_id, plate, brand, model, year, color, odometer, notes,
            created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            team_id,
            client_id,
            plate,
            optional_string(payload, "brand"),
            optional_string(payload, "model"),
            optional_i64(payload, "year"),
            optional_string(payload, "color"),
            optional_f64(payload, "odometer"),
            optional_string(payload, "notes"),
        ],
    )
    .map_err(|e| {
        if e.to_string().to_lowercase().contains("unique") {
            "A vehicle with this plate already exists".to_string()
        } else {
            e.to_string()
        }
    })?;
    let id = conn.last_insert_rowid();
    get_vehicle(conn, team_id, id)?.ok_or_else(|| "Failed to load created vehicle".to_string())
}

pub fn update_vehicle(
    conn: &Connection,
    team_id: i64,
    vehicle_id: i64,
    payload: &Value,
) -> Result<Option<Value>, String> {
    if get_vehicle(conn, team_id, vehicle_id)?.is_none() {
        return Ok(None);
    }
    if let Some(client_id) = optional_i64(payload, "clientId") {
        if get_client(conn, team_id, client_id)?.is_none() {
            return Err("Client not found".to_string());
        }
        conn.execute(
            "UPDATE vehicles SET client_id = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![client_id, vehicle_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(plate) = payload.get("plate").and_then(|v| v.as_str()).map(|s| s.trim().to_uppercase()) {
        if plate.is_empty() {
            return Err("Vehicle plate is required".to_string());
        }
        conn.execute(
            "UPDATE vehicles SET plate = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![plate, vehicle_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    for (key, column) in [
        ("brand", "brand"),
        ("model", "model"),
        ("color", "color"),
        ("notes", "notes"),
    ] {
        if payload.get(key).is_some() {
            let value = optional_string(payload, key);
            conn.execute(
                &format!(
                    "UPDATE vehicles SET {} = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
                    column
                ),
                params![value, vehicle_id, team_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    if payload.get("year").is_some() {
        conn.execute(
            "UPDATE vehicles SET year = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_i64(payload, "year"), vehicle_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("odometer").is_some() {
        conn.execute(
            "UPDATE vehicles SET odometer = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_f64(payload, "odometer"), vehicle_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    get_vehicle(conn, team_id, vehicle_id)
}

pub fn delete_vehicle(conn: &Connection, team_id: i64, vehicle_id: i64) -> Result<bool, String> {
    let changed = conn
        .execute(
            "DELETE FROM vehicles WHERE id = ? AND team_id = ?",
            params![vehicle_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed > 0)
}

fn service_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "teamId": row.get::<_, i64>(1)?,
        "name": row.get::<_, String>(2)?,
        "description": row.get::<_, Option<String>>(3)?,
        "price": row.get::<_, f64>(4)?,
        "estimatedMinutes": row.get::<_, i64>(5)?,
        "createdAt": row.get::<_, i64>(6)? * 1000,
        "updatedAt": row.get::<_, i64>(7)? * 1000,
    }))
}

pub fn list_services(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, team_id, name, description, price, estimated_minutes, created_at, updated_at
             FROM services WHERE team_id = ? ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], service_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn get_service(
    conn: &Connection,
    team_id: i64,
    service_id: i64,
) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, team_id, name, description, price, estimated_minutes, created_at, updated_at
             FROM services WHERE id = ? AND team_id = ?",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![service_id, team_id], service_json)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn create_service(conn: &Connection, team_id: i64, payload: &Value) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Service name is required".to_string())?;
    let price = optional_f64(payload, "price").unwrap_or(0.0);
    let minutes = optional_i64(payload, "estimatedMinutes").unwrap_or(0);
    conn.execute(
        "INSERT INTO services (
            team_id, name, description, price, estimated_minutes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            team_id,
            name,
            optional_string(payload, "description"),
            price,
            minutes
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    get_service(conn, team_id, id)?.ok_or_else(|| "Failed to load created service".to_string())
}

pub fn update_service(
    conn: &Connection,
    team_id: i64,
    service_id: i64,
    payload: &Value,
) -> Result<Option<Value>, String> {
    if get_service(conn, team_id, service_id)?.is_none() {
        return Ok(None);
    }
    if let Some(name) = payload.get("name").and_then(|v| v.as_str()).map(str::trim) {
        if name.is_empty() {
            return Err("Service name is required".to_string());
        }
        conn.execute(
            "UPDATE services SET name = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![name, service_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("description").is_some() {
        conn.execute(
            "UPDATE services SET description = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_string(payload, "description"), service_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(price) = optional_f64(payload, "price") {
        conn.execute(
            "UPDATE services SET price = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![price, service_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(minutes) = optional_i64(payload, "estimatedMinutes") {
        conn.execute(
            "UPDATE services SET estimated_minutes = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![minutes, service_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    get_service(conn, team_id, service_id)
}

pub fn delete_service(conn: &Connection, team_id: i64, service_id: i64) -> Result<bool, String> {
    let changed = conn
        .execute(
            "DELETE FROM services WHERE id = ? AND team_id = ?",
            params![service_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed > 0)
}

fn order_line_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "serviceOrderId": row.get::<_, i64>(1)?,
        "kind": row.get::<_, String>(2)?,
        "refId": row.get::<_, Option<i64>>(3)?,
        "description": row.get::<_, String>(4)?,
        "quantity": row.get::<_, f64>(5)?,
        "unitPrice": row.get::<_, f64>(6)?,
        "lineTotal": row.get::<_, f64>(7)?,
        "createdAt": row.get::<_, i64>(8)? * 1000,
        "updatedAt": row.get::<_, i64>(9)? * 1000,
    }))
}

fn order_json(row: &rusqlite::Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, i64>(0)?,
        "teamId": row.get::<_, i64>(1)?,
        "clientId": row.get::<_, Option<i64>>(2)?,
        "vehicleId": row.get::<_, Option<i64>>(3)?,
        "status": row.get::<_, String>(4)?,
        "paymentStatus": row.get::<_, String>(5)?,
        "odometer": row.get::<_, Option<f64>>(6)?,
        "complaint": row.get::<_, Option<String>>(7)?,
        "diagnosis": row.get::<_, Option<String>>(8)?,
        "notes": row.get::<_, Option<String>>(9)?,
        "discount": row.get::<_, f64>(10)?,
        "laborTotal": row.get::<_, f64>(11)?,
        "partsTotal": row.get::<_, f64>(12)?,
        "total": row.get::<_, f64>(13)?,
        "stockDebited": row.get::<_, i64>(14)? == 1,
        "openedAt": row.get::<_, i64>(15)? * 1000,
        "closedAt": row.get::<_, Option<i64>>(16)?.map(|v| v * 1000),
        "createdAt": row.get::<_, i64>(17)? * 1000,
        "updatedAt": row.get::<_, i64>(18)? * 1000,
        "clientName": row.get::<_, Option<String>>(19)?,
        "vehiclePlate": row.get::<_, Option<String>>(20)?,
        "vehicleLabel": row.get::<_, Option<String>>(21)?,
    }))
}

const ORDER_SELECT: &str = "SELECT so.id, so.team_id, so.client_id, so.vehicle_id, so.status,
    so.payment_status, so.odometer, so.complaint, so.diagnosis, so.notes, so.discount,
    so.labor_total, so.parts_total, so.total, so.stock_debited, so.opened_at, so.closed_at,
    so.created_at, so.updated_at, c.name, v.plate,
    TRIM(COALESCE(v.brand, '') || ' ' || COALESCE(v.model, ''))
 FROM service_orders so
 LEFT JOIN clients c ON c.id = so.client_id
 LEFT JOIN vehicles v ON v.id = so.vehicle_id";

fn list_order_items(conn: &Connection, order_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, service_order_id, kind, ref_id, description, quantity, unit_price, line_total,
                    created_at, updated_at
             FROM service_order_items WHERE service_order_id = ? ORDER BY id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![order_id], order_line_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

fn recompute_totals(conn: &Connection, order_id: i64, team_id: i64, discount: Option<f64>) -> Result<(), String> {
    let mut labor = 0.0_f64;
    let mut parts = 0.0_f64;
    let mut stmt = conn
        .prepare("SELECT kind, line_total FROM service_order_items WHERE service_order_id = ?")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![order_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    for (kind, total) in rows {
        if kind == "service" {
            labor += total;
        } else {
            parts += total;
        }
    }
    let current_discount: f64 = conn
        .query_row(
            "SELECT discount FROM service_orders WHERE id = ? AND team_id = ?",
            params![order_id, team_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let disc = discount.unwrap_or(current_discount);
    let total = (labor + parts - disc).max(0.0);
    conn.execute(
        "UPDATE service_orders
         SET labor_total = ?, parts_total = ?, discount = ?, total = ?, updated_at = unixepoch()
         WHERE id = ? AND team_id = ?",
        params![labor, parts, disc, total, order_id, team_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list_service_orders(conn: &Connection, team_id: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "{} WHERE so.team_id = ? ORDER BY so.opened_at DESC, so.id DESC",
            ORDER_SELECT
        ))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![team_id], order_json)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub fn get_service_order(
    conn: &Connection,
    team_id: i64,
    order_id: i64,
) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "{} WHERE so.id = ? AND so.team_id = ?",
            ORDER_SELECT
        ))
        .map_err(|e| e.to_string())?;
    let mut order = match stmt
        .query_row(params![order_id, team_id], order_json)
        .optional()
        .map_err(|e| e.to_string())?
    {
        Some(value) => value,
        None => return Ok(None),
    };
    let items = list_order_items(conn, order_id)?;
    if let Some(obj) = order.as_object_mut() {
        obj.insert("items".to_string(), json!(items));
    }
    Ok(Some(order))
}

pub fn create_service_order(
    conn: &Connection,
    team_id: i64,
    payload: &Value,
) -> Result<Value, String> {
    conn.execute(
        "INSERT INTO service_orders (
            team_id, client_id, vehicle_id, status, payment_status, odometer,
            complaint, diagnosis, notes, discount, labor_total, parts_total, total,
            stock_debited, opened_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, unixepoch(), unixepoch(), unixepoch())",
        params![
            team_id,
            optional_i64(payload, "clientId"),
            optional_i64(payload, "vehicleId"),
            payload
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("open"),
            payload
                .get("paymentStatus")
                .and_then(|v| v.as_str())
                .unwrap_or("pending"),
            optional_f64(payload, "odometer"),
            optional_string(payload, "complaint"),
            optional_string(payload, "diagnosis"),
            optional_string(payload, "notes"),
            optional_f64(payload, "discount").unwrap_or(0.0),
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    get_service_order(conn, team_id, id)?
        .ok_or_else(|| "Failed to load created service order".to_string())
}

fn debit_parts_stock(conn: &Connection, team_id: i64, order_id: i64) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT ref_id, quantity FROM service_order_items
             WHERE service_order_id = ? AND kind = 'part' AND ref_id IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;
    let lines = stmt
        .query_map(params![order_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (item_id, qty) in lines {
        if qty <= 0.0 {
            continue;
        }
        let payload = json!({
            "itemId": item_id,
            "transactionType": "stock_out",
            "quantity": qty,
            "notes": format!("OS #{}", order_id),
            "destinationKind": "service_order",
            "destinationLabel": format!("OS #{}", order_id),
        });
        db::create_stock_transaction(conn, team_id, &payload)?;
    }
    conn.execute(
        "UPDATE service_orders SET stock_debited = 1, updated_at = unixepoch()
         WHERE id = ? AND team_id = ?",
        params![order_id, team_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_service_order(
    conn: &Connection,
    team_id: i64,
    order_id: i64,
    payload: &Value,
) -> Result<Option<Value>, String> {
    let existing = match get_service_order(conn, team_id, order_id)? {
        Some(value) => value,
        None => return Ok(None),
    };
    let current_status = existing
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("open");
    let stock_debited = existing
        .get("stockDebited")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if let Some(status) = payload.get("status").and_then(|v| v.as_str()) {
        if current_status == "closed" && status != "closed" {
            return Err("Closed service orders cannot be reopened in v1".to_string());
        }
        conn.execute(
            "UPDATE service_orders SET status = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![status, order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
        if status == "closed" && current_status != "closed" && !stock_debited {
            conn.execute(
                "UPDATE service_orders SET closed_at = unixepoch() WHERE id = ? AND team_id = ?",
                params![order_id, team_id],
            )
            .map_err(|e| e.to_string())?;
            debit_parts_stock(conn, team_id, order_id)?;
        }
    }

    if payload.get("clientId").is_some() {
        conn.execute(
            "UPDATE service_orders SET client_id = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_i64(payload, "clientId"), order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("vehicleId").is_some() {
        conn.execute(
            "UPDATE service_orders SET vehicle_id = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_i64(payload, "vehicleId"), order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(payment_status) = payload.get("paymentStatus").and_then(|v| v.as_str()) {
        conn.execute(
            "UPDATE service_orders SET payment_status = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![payment_status, order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if payload.get("odometer").is_some() {
        conn.execute(
            "UPDATE service_orders SET odometer = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
            params![optional_f64(payload, "odometer"), order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    }
    for key in ["complaint", "diagnosis", "notes"] {
        if payload.get(key).is_some() {
            conn.execute(
                &format!(
                    "UPDATE service_orders SET {} = ?, updated_at = unixepoch() WHERE id = ? AND team_id = ?",
                    key
                ),
                params![optional_string(payload, key), order_id, team_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    if payload.get("discount").is_some() {
        recompute_totals(conn, order_id, team_id, optional_f64(payload, "discount"))?;
    }

    get_service_order(conn, team_id, order_id)
}

pub fn add_service_order_item(
    conn: &Connection,
    team_id: i64,
    order_id: i64,
    payload: &Value,
) -> Result<Value, String> {
    let order = get_service_order(conn, team_id, order_id)?
        .ok_or_else(|| "Service order not found".to_string())?;
    if order.get("status").and_then(|v| v.as_str()) == Some("closed") {
        return Err("Cannot add items to a closed service order".to_string());
    }
    let kind = payload
        .get("kind")
        .and_then(|v| v.as_str())
        .filter(|k| *k == "part" || *k == "service")
        .ok_or_else(|| "Item kind must be part or service".to_string())?;
    let description = payload
        .get("description")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Item description is required".to_string())?;
    let quantity = optional_f64(payload, "quantity").unwrap_or(1.0).max(0.01);
    let unit_price = optional_f64(payload, "unitPrice").unwrap_or(0.0).max(0.0);
    let line_total = quantity * unit_price;
    conn.execute(
        "INSERT INTO service_order_items (
            service_order_id, kind, ref_id, description, quantity, unit_price, line_total,
            created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())",
        params![
            order_id,
            kind,
            optional_i64(payload, "refId"),
            description,
            quantity,
            unit_price,
            line_total
        ],
    )
    .map_err(|e| e.to_string())?;
    let item_id = conn.last_insert_rowid();
    recompute_totals(conn, order_id, team_id, None)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, service_order_id, kind, ref_id, description, quantity, unit_price, line_total,
                    created_at, updated_at
             FROM service_order_items WHERE id = ?",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![item_id], order_line_json)
        .map_err(|e| e.to_string())
}

pub fn remove_service_order_item(
    conn: &Connection,
    team_id: i64,
    order_id: i64,
    item_id: i64,
) -> Result<bool, String> {
    let order = get_service_order(conn, team_id, order_id)?
        .ok_or_else(|| "Service order not found".to_string())?;
    if order.get("status").and_then(|v| v.as_str()) == Some("closed") {
        return Err("Cannot remove items from a closed service order".to_string());
    }
    let changed = conn
        .execute(
            "DELETE FROM service_order_items WHERE id = ? AND service_order_id = ?",
            params![item_id, order_id],
        )
        .map_err(|e| e.to_string())?;
    if changed == 0 {
        return Ok(false);
    }
    recompute_totals(conn, order_id, team_id, None)?;
    Ok(true)
}

pub fn delete_service_order(
    conn: &Connection,
    team_id: i64,
    order_id: i64,
) -> Result<bool, String> {
    let order = match get_service_order(conn, team_id, order_id)? {
        Some(value) => value,
        None => return Ok(false),
    };
    if order
        .get("stockDebited")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Err("Cannot delete a service order that already debited stock".to_string());
    }
    let changed = conn
        .execute(
            "DELETE FROM service_orders WHERE id = ? AND team_id = ?",
            params![order_id, team_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed > 0)
}
