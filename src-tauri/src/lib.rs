mod commands;
mod db;
mod labels_export;
mod oficina;
mod team_data_export;

use db::{init_connection, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = init_connection(&app.handle())?;
            app.manage(DbState {
                conn: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::init_database,
            commands::list_teams,
            commands::get_team,
            commands::create_team,
            commands::update_team,
            commands::delete_team,
            commands::list_team_items,
            commands::get_team_item,
            commands::create_team_item,
            commands::update_team_item,
            commands::delete_team_item,
            commands::list_team_locations,
            commands::create_team_location,
            commands::update_team_location,
            commands::delete_team_location,
            commands::list_team_transactions,
            commands::get_team_report_stats,
            commands::create_team_stock_transaction,
            commands::list_team_clients,
            commands::create_team_client,
            commands::update_team_client,
            commands::delete_team_client,
            commands::list_team_vehicles,
            commands::create_team_vehicle,
            commands::update_team_vehicle,
            commands::delete_team_vehicle,
            commands::list_team_workshop_services,
            commands::create_team_workshop_service,
            commands::update_team_workshop_service,
            commands::delete_team_workshop_service,
            commands::list_team_service_orders,
            commands::get_team_service_order,
            commands::create_team_service_order,
            commands::update_team_service_order,
            commands::add_team_service_order_item,
            commands::remove_team_service_order_item,
            commands::delete_team_service_order,
            labels_export::save_labels_pdf,
            labels_export::open_labels_pdf,
            labels_export::reveal_labels_pdf,
            team_data_export::export_full_backup,
            team_data_export::delete_all_data,
            team_data_export::import_team_backup,
            team_data_export::preview_team_items_csv,
            team_data_export::import_team_items_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
