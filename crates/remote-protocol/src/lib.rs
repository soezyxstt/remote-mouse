pub mod actions;
pub mod capabilities;
pub mod macros;
pub mod messages;
pub mod panels;
pub mod traits;

pub use actions::{Action, ActionResult};
pub use capabilities::Capability;
pub use macros::{ActionIntent, MacroCondition, MacroDefinition, MacroStep};
pub use messages::*;
pub use panels::{
    AppRules, ComponentType, GridPlacement, PanelComponent, PanelDefinition, PanelLayout,
};
pub use traits::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pointer_delta_serde() {
        let delta = PointerDeltaData {
            dx: 12.5,
            dy: -3.2,
            dt: Some(16),
        };
        let serialized = serde_json::to_string(&delta).unwrap();
        let deserialized: PointerDeltaData = serde_json::from_str(&serialized).unwrap();
        assert_eq!(delta, deserialized);
    }

    #[test]
    fn test_macro_step_serde() {
        let step = MacroStep::Condition {
            condition: MacroCondition::ProcessRunning {
                process_name: "code.exe".to_string(),
            },
            on_true: Some(vec![MacroStep::Action {
                intent: ActionIntent::AppsLaunch {
                    app_id: "vscode".to_string(),
                },
            }]),
            on_false: None,
        };
        let serialized = serde_json::to_string(&step).unwrap();
        let deserialized: MacroStep = serde_json::from_str(&serialized).unwrap();
        assert_eq!(step, deserialized);
    }

    #[test]
    fn test_panel_definition_serde() {
        let panel = PanelDefinition {
            id: "preset_general".to_string(),
            name: "General Control".to_string(),
            category: "general".to_string(),
            icon: Some("mouse".to_string()),
            version: 1,
            is_built_in: true,
            app_rules: None,
            layout: PanelLayout {
                columns: 12,
                row_height: 56,
            },
            components: vec![PanelComponent {
                id: "trackpad_main".to_string(),
                component_type: ComponentType::Trackpad,
                label: Some("Trackpad".to_string()),
                icon: None,
                variant: None,
                grid: GridPlacement {
                    x: 0,
                    y: 0,
                    w: 12,
                    h: 6,
                },
                props: None,
                action: None,
            }],
        };
        let serialized = serde_json::to_string(&panel).unwrap();
        let deserialized: PanelDefinition = serde_json::from_str(&serialized).unwrap();
        assert_eq!(panel, deserialized);
    }
}
