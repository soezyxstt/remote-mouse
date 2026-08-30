use remote_protocol::{
    ActionIntent, AppRules, ComponentType, GridPlacement, PanelComponent, PanelDefinition,
    PanelLayout,
};

pub fn get_builtin_presets() -> Vec<PanelDefinition> {
    vec![
        // 1. General Remote
        PanelDefinition {
            id: "preset_general".to_string(),
            name: "General Remote".to_string(),
            category: "general".to_string(),
            icon: Some("layout-grid".to_string()),
            version: 1,
            is_built_in: true,
            app_rules: None,
            layout: PanelLayout {
                columns: 12,
                row_height: 56,
            },
            components: vec![
                PanelComponent {
                    id: "gen_trackpad".to_string(),
                    component_type: ComponentType::Trackpad,
                    label: Some("Trackpad".to_string()),
                    icon: None,
                    variant: None,
                    grid: GridPlacement {
                        x: 0,
                        y: 0,
                        w: 12,
                        h: 5,
                    },
                    props: None,
                    action: None,
                },
                PanelComponent {
                    id: "gen_btn_left".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Left Click".to_string()),
                    icon: Some("mouse".to_string()),
                    variant: Some("primary".to_string()),
                    grid: GridPlacement {
                        x: 0,
                        y: 5,
                        w: 6,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::MouseClick {
                        button: "left".to_string(),
                    }),
                },
                PanelComponent {
                    id: "gen_btn_right".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Right Click".to_string()),
                    icon: Some("mouse".to_string()),
                    variant: Some("secondary".to_string()),
                    grid: GridPlacement {
                        x: 6,
                        y: 5,
                        w: 6,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::MouseClick {
                        button: "right".to_string(),
                    }),
                },
            ],
        },
        // 2. Media Companion Preset
        PanelDefinition {
            id: "preset_media".to_string(),
            name: "Media Remote".to_string(),
            category: "media".to_string(),
            icon: Some("music".to_string()),
            version: 1,
            is_built_in: true,
            app_rules: Some(AppRules {
                process_names: vec![
                    "spotify.exe".to_string(),
                    "vlc.exe".to_string(),
                    "wmplayer.exe".to_string(),
                ],
                auto_switch: false,
            }),
            layout: PanelLayout {
                columns: 12,
                row_height: 56,
            },
            components: vec![
                PanelComponent {
                    id: "media_display".to_string(),
                    component_type: ComponentType::MediaDisplay,
                    label: Some("Now Playing".to_string()),
                    icon: None,
                    variant: None,
                    grid: GridPlacement {
                        x: 0,
                        y: 0,
                        w: 12,
                        h: 4,
                    },
                    props: None,
                    action: None,
                },
                PanelComponent {
                    id: "media_prev".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Previous".to_string()),
                    icon: Some("skip-back".to_string()),
                    variant: Some("surface".to_string()),
                    grid: GridPlacement {
                        x: 0,
                        y: 4,
                        w: 4,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::MediaControl {
                        action: "prev".to_string(),
                    }),
                },
                PanelComponent {
                    id: "media_play".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Play / Pause".to_string()),
                    icon: Some("play".to_string()),
                    variant: Some("primary".to_string()),
                    grid: GridPlacement {
                        x: 4,
                        y: 4,
                        w: 4,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::MediaControl {
                        action: "play_pause".to_string(),
                    }),
                },
                PanelComponent {
                    id: "media_next".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Next".to_string()),
                    icon: Some("skip-forward".to_string()),
                    variant: Some("surface".to_string()),
                    grid: GridPlacement {
                        x: 8,
                        y: 4,
                        w: 4,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::MediaControl {
                        action: "next".to_string(),
                    }),
                },
            ],
        },
        // 3. Presentation Remote
        PanelDefinition {
            id: "preset_presentation".to_string(),
            name: "Presentation Remote".to_string(),
            category: "presentation".to_string(),
            icon: Some("presentation".to_string()),
            version: 1,
            is_built_in: true,
            app_rules: Some(AppRules {
                process_names: vec!["powerpnt.exe".to_string(), "keynote.exe".to_string()],
                auto_switch: false,
            }),
            layout: PanelLayout {
                columns: 12,
                row_height: 60,
            },
            components: vec![
                PanelComponent {
                    id: "pres_prev".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Previous Slide".to_string()),
                    icon: Some("chevron-left".to_string()),
                    variant: Some("surface".to_string()),
                    grid: GridPlacement {
                        x: 0,
                        y: 0,
                        w: 6,
                        h: 3,
                    },
                    props: None,
                    action: Some(ActionIntent::PresentationControl {
                        action: "prev".to_string(),
                    }),
                },
                PanelComponent {
                    id: "pres_next".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Next Slide".to_string()),
                    icon: Some("chevron-right".to_string()),
                    variant: Some("primary".to_string()),
                    grid: GridPlacement {
                        x: 6,
                        y: 0,
                        w: 6,
                        h: 3,
                    },
                    props: None,
                    action: Some(ActionIntent::PresentationControl {
                        action: "next".to_string(),
                    }),
                },
                PanelComponent {
                    id: "pres_start".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Start F5".to_string()),
                    icon: Some("play".to_string()),
                    variant: Some("secondary".to_string()),
                    grid: GridPlacement {
                        x: 0,
                        y: 3,
                        w: 6,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::PresentationControl {
                        action: "start".to_string(),
                    }),
                },
                PanelComponent {
                    id: "pres_black".to_string(),
                    component_type: ComponentType::Button,
                    label: Some("Black Screen".to_string()),
                    icon: Some("square".to_string()),
                    variant: Some("ghost".to_string()),
                    grid: GridPlacement {
                        x: 6,
                        y: 3,
                        w: 6,
                        h: 1,
                    },
                    props: None,
                    action: Some(ActionIntent::PresentationControl {
                        action: "black_screen".to_string(),
                    }),
                },
            ],
        },
    ]
}
