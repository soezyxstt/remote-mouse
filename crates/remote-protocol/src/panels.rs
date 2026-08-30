use crate::macros::ActionIntent;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentType {
    Trackpad,
    Button,
    Toggle,
    Slider,
    Dpad,
    MediaDisplay,
    Label,
    Spacer,
    TextInput,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GridPlacement {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PanelComponent {
    pub id: String,
    #[serde(rename = "type")]
    pub component_type: ComponentType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
    pub grid: GridPlacement,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub props: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<ActionIntent>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PanelLayout {
    pub columns: u32,
    #[serde(rename = "rowHeight")]
    pub row_height: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AppRules {
    #[serde(rename = "processNames")]
    pub process_names: Vec<String>,
    #[serde(rename = "autoSwitch")]
    pub auto_switch: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PanelDefinition {
    pub id: String,
    pub name: String,
    pub category: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub version: u32,
    #[serde(rename = "isBuiltIn")]
    pub is_built_in: bool,
    #[serde(rename = "appRules", default, skip_serializing_if = "Option::is_none")]
    pub app_rules: Option<AppRules>,
    pub layout: PanelLayout,
    pub components: Vec<PanelComponent>,
}

impl PanelDefinition {
    /// Forward-compatible schema migrator
    pub fn migrate_from_json(raw: serde_json::Value) -> Result<Self, serde_json::Error> {
        let version = raw.get("version").and_then(|v| v.as_u64()).unwrap_or(1);
        match version {
            1 => serde_json::from_value::<PanelDefinition>(raw),
            _ => serde_json::from_value::<PanelDefinition>(raw),
        }
    }
}
