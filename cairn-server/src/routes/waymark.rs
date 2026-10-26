use crate::config::WAYMARK_FILE;
use crate::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Deserialize)]
pub struct WaymarkQuery {
    /// Node whose waymark to read; absent = the map's own root.
    pub node: Option<String>,
}

/// Read a waymark fresh from disk, so edits to it show up without a reload.
/// The path comes from compose-time discovery (config.rs), never from the
/// request — the client names a node, not a file — so there's nothing to confine.
pub async fn get_waymark(
    State(state): State<AppState>,
    Query(params): Query<WaymarkQuery>,
) -> Result<Json<Value>, StatusCode> {
    let path = match params.node {
        Some(id) => state
            .graph
            .lock()
            .unwrap()
            .nodes
            .get(&id)
            .and_then(|n| n.waymark.clone())
            .ok_or(StatusCode::NOT_FOUND)?,
        None => WAYMARK_FILE.to_string(),
    };

    let content = std::fs::read_to_string(state.resolved_root.join(&path))
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(json!({ "path": path, "content": content })))
}
