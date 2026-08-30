#![cfg(windows)]

use async_trait::async_trait;
use remote_protocol::traits::*;
use remote_protocol::*;
use tracing::{error, info};
use windows::Win32::Foundation::*;
use windows::Win32::System::Power::SetSuspendState;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;

pub struct WindowsNativeProvider;

impl WindowsNativeProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl InputProvider for WindowsNativeProvider {
    async fn pointer_move_relative(&self, dx: f32, dy: f32) -> Result<(), PlatformError> {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: dx.round() as i32,
                    dy: dy.round() as i32,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_MOVE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        Ok(())
    }

    async fn pointer_button(&self, button: &str, state: &str) -> Result<(), PlatformError> {
        let flags = match (button, state) {
            ("left", "down") => MOUSEEVENTF_LEFTDOWN,
            ("left", "up") => MOUSEEVENTF_LEFTUP,
            ("right", "down") => MOUSEEVENTF_RIGHTDOWN,
            ("right", "up") => MOUSEEVENTF_RIGHTUP,
            ("middle", "down") => MOUSEEVENTF_MIDDLEDOWN,
            ("middle", "up") => MOUSEEVENTF_MIDDLEUP,
            ("left", "click") => {
                let down = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: MOUSEEVENTF_LEFTDOWN,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                let up = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: MOUSEEVENTF_LEFTUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                unsafe {
                    SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32);
                }
                return Ok(());
            }
            ("right", "click") => {
                let down = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: MOUSEEVENTF_RIGHTDOWN,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                let up = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: MOUSEEVENTF_RIGHTUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                unsafe {
                    SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32);
                }
                return Ok(());
            }
            _ => MOUSEEVENTF_LEFTDOWN,
        };

        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        Ok(())
    }

    async fn pointer_scroll(&self, dx: f32, dy: f32) -> Result<(), PlatformError> {
        let mut inputs = Vec::new();
        if dy != 0.0 {
            inputs.push(INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: (dy * 120.0) as i32,
                        dwFlags: MOUSEEVENTF_WHEEL,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }
        if dx != 0.0 {
            inputs.push(INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: (dx * 120.0) as i32,
                        dwFlags: MOUSEEVENTF_HWHEEL,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }
        if !inputs.is_empty() {
            unsafe {
                SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            }
        }
        Ok(())
    }

    async fn key_action(
        &self,
        key: &str,
        state: &str,
        modifiers: &[String],
    ) -> Result<(), PlatformError> {
        let vk = match key {
            "Escape" | "Esc" => VK_ESCAPE,
            "Tab" => VK_TAB,
            "Enter" | "Return" => VK_RETURN,
            "Backspace" => VK_BACK,
            "Delete" | "Del" => VK_DELETE,
            "ArrowLeft" | "Left" => VK_LEFT,
            "ArrowUp" | "Up" => VK_UP,
            "ArrowRight" | "Right" => VK_RIGHT,
            "ArrowDown" | "Down" => VK_DOWN,
            "PageUp" | "PgUp" => VK_PRIOR,
            "PageDown" | "PgDn" => VK_NEXT,
            "Home" => VK_HOME,
            "End" => VK_END,
            "Space" => VK_SPACE,
            "F5" => VK_F5,
            "Control" | "Ctrl" => VK_CONTROL,
            "Alt" => VK_MENU,
            "Shift" => VK_SHIFT,
            "Meta" | "Win" => VK_LWIN,
            _ => VK_SPACE,
        };

        let mut inputs = Vec::new();

        for m in modifiers {
            let m_vk = match m.as_str() {
                "ctrl" => VK_CONTROL,
                "alt" => VK_MENU,
                "shift" => VK_SHIFT,
                "win" => VK_LWIN,
                _ => continue,
            };
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: m_vk,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }

        match state {
            "down" => {
                inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYBD_EVENT_FLAGS(0),
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
            "up" => {
                inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
            "tap" => {
                inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYBD_EVENT_FLAGS(0),
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
                inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
            _ => {}
        }

        if state == "tap" {
            for m in modifiers.iter().rev() {
                let m_vk = match m.as_str() {
                    "ctrl" => VK_CONTROL,
                    "alt" => VK_MENU,
                    "shift" => VK_SHIFT,
                    "win" => VK_LWIN,
                    _ => continue,
                };
                inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: m_vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
        }

        if !inputs.is_empty() {
            unsafe {
                SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            }
        }
        Ok(())
    }

    async fn text_stream(&self, text: &str) -> Result<(), PlatformError> {
        let mut inputs = Vec::new();
        for ch in text.encode_utf16() {
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }
        if !inputs.is_empty() {
            unsafe {
                SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            }
        }
        Ok(())
    }

    async fn release_all_inputs(&self) -> Result<(), PlatformError> {
        let modifier_vks = [
            VK_CONTROL,
            VK_LCONTROL,
            VK_RCONTROL,
            VK_MENU,
            VK_LMENU,
            VK_RMENU,
            VK_SHIFT,
            VK_LSHIFT,
            VK_RSHIFT,
            VK_LWIN,
            VK_RWIN,
        ];

        let mut inputs = Vec::new();

        // Release all modifiers
        for vk in modifier_vks {
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            });
        }

        // Release all mouse buttons (left, right, middle)
        inputs.push(INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_LEFTUP | MOUSEEVENTF_RIGHTUP | MOUSEEVENTF_MIDDLEUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });

        unsafe {
            SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        }
        Ok(())
    }
}

#[async_trait]
impl PowerProvider for WindowsNativeProvider {
    async fn power_command(&self, action: &str) -> Result<(), PlatformError> {
        unsafe {
            match action {
                "lock" => {
                    let _ = LockWorkStation();
                }
                "sleep" => {
                    let _ = SetSuspendState(false, true, false);
                }
                "restart" => {
                    let _ = ExitWindowsEx(EWX_REBOOT | EWX_FORCEIFHUNG, SHTDN_REASON_FLAG_PLANNED);
                }
                "shutdown" => {
                    let _ = ExitWindowsEx(EWX_SHUTDOWN | EWX_FORCEIFHUNG, SHTDN_REASON_FLAG_PLANNED);
                }
                _ => return Err(PlatformError::NotSupported(action.to_string())),
            }
        }
        Ok(())
    }
}
