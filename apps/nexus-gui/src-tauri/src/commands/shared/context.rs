use nexus_core::AppContext;

use super::super::state::AppState;

pub(super) fn app_context_from_state(
    state: &tauri::State<'_, AppState>,
) -> Result<AppContext, String> {
    let db = state
        .db
        .lock()
        .map_err(|_| "Database state lock poisoned".to_string())?;
    Ok(AppContext::from_env().with_db_path(db.path().to_path_buf()))
}
