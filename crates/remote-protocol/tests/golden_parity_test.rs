use remote_protocol::actions::{Action, ActionResult};
use remote_protocol::messages::{
    DisplayInfo, FileItem, ForegroundAppState, MediaSessionState, SessionReadyData,
};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[test]
fn test_rust_golden_actions_parity() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let golden_path = Path::new(manifest_dir)
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("packages/protocol/fixtures/golden/actions.json");

    let raw = fs::read_to_string(&golden_path)
        .unwrap_or_else(|_| panic!("Failed to read golden actions from {:?}", golden_path));

    let map: HashMap<String, Action> = serde_json::from_str(&raw).unwrap();
    assert!(map.len() >= 12);

    for (key, action) in map {
        assert!(
            action.validate_bounds().is_ok(),
            "Action {} failed bounds check",
            key
        );

        // Check bidirectional round-trip
        let serialized = serde_json::to_string(&action).unwrap();
        let deserialized: Action = serde_json::from_str(&serialized).unwrap();
        assert_eq!(action, deserialized);
    }
}

#[test]
fn test_rust_golden_queries_and_events_parity() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let golden_path = Path::new(manifest_dir)
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("packages/protocol/fixtures/golden/queries_and_events.json");

    let raw = fs::read_to_string(&golden_path).unwrap();
    let json: serde_json::Value = serde_json::from_str(&raw).unwrap();

    let session_ready: SessionReadyData =
        serde_json::from_value(json["sessionReady"].clone()).unwrap();
    assert_eq!(session_ready.server_name, "Workstation-Win11");

    let fg_app: ForegroundAppState =
        serde_json::from_value(json["foregroundAppState"].clone()).unwrap();
    assert_eq!(fg_app.category, "browser");

    let media: MediaSessionState =
        serde_json::from_value(json["mediaSessionState"].clone()).unwrap();
    assert_eq!(media.title, "Song Title");

    let display: DisplayInfo = serde_json::from_value(json["displayInfo"].clone()).unwrap();
    assert_eq!(display.width, 1920);

    let file_item: FileItem = serde_json::from_value(json["fileItem"].clone()).unwrap();
    assert_eq!(file_item.name, "sample.txt");

    let act_ok: ActionResult = serde_json::from_value(json["actionResultOk"].clone()).unwrap();
    assert_eq!(act_ok.status, "ok");

    let act_err: ActionResult = serde_json::from_value(json["actionResultError"].clone()).unwrap();
    assert_eq!(act_err.status, "error");
}
