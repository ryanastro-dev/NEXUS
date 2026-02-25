use nexus_core::AppContext;

use super::super::state::AppState;

pub(super) fn app_context_from_state(
    state: &tauri::State<'_, AppState>,
) -> Result<AppContext, String> {
    Ok(AppContext::from_env().with_db_path(state.db.path().to_path_buf()))
}
