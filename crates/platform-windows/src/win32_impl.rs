#![cfg(windows)]

use async_trait::async_trait;
use remote_protocol::traits::*;
use remote_protocol::*;
use std::sync::Arc;
use tracing::{error, info};
use windows::core::PWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::DataExchange::*;
use windows::Win32::System::Memory::*;
use windows::Win32::System::Power::SetSuspendState;
use windows::Win32::System::ProcessStatus::*;
use windows::Win32::System::Shutdown::*;
use windows::Win32::System::Threading::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;

pub struct WindowsNativeProvider;

impl WindowsNativeProvider {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WindowsNativeProvider {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_virtual_key(key: &str) -> VIRTUAL_KEY {
    let lower = key.to_lowercase();
    match lower.as_str() {
        "escape" | "esc" => VK_ESCAPE,
        "tab" => VK_TAB,
        "enter" | "return" => VK_RETURN,
        "backspace" => VK_BACK,
        "delete" | "del" => VK_DELETE,
        "insert" => VK_INSERT,
        "arrowleft" | "left" => VK_LEFT,
        "arrowup" | "up" => VK_UP,
        "arrowright" | "right" => VK_RIGHT,
        "arrowdown" | "down" => VK_DOWN,
        "pageup" | "pgup" => VK_PRIOR,
        "pagedown" | "pgdn" => VK_NEXT,
        "home" => VK_HOME,
        "end" => VK_END,
        "space" | " " => VK_SPACE,
        "control" | "ctrl" => VK_CONTROL,
        "alt" => VK_MENU,
        "shift" => VK_SHIFT,
        "meta" | "win" | "cmd" | "command" => VK_LWIN,
        "capslock" => VK_CAPITAL,
        "numlock" => VK_NUMLOCK,
        "scrolllock" => VK_SCROLL,
        "printscreen" | "prtscn" => VK_SNAPSHOT,
        "f1" => VK_F1,
        "f2" => VK_F2,
        "f3" => VK_F3,
        "f4" => VK_F4,
        "f5" => VK_F5,
        "f6" => VK_F6,
        "f7" => VK_F7,
        "f8" => VK_F8,
        "f9" => VK_F9,
        "f10" => VK_F10,
        "f11" => VK_F11,
        "f12" => VK_F12,
        "mediaplaypause" => VK_MEDIA_PLAY_PAUSE,
        "medianexttrack" => VK_MEDIA_NEXT_TRACK,
        "mediaprevtrack" => VK_MEDIA_PREV_TRACK,
        "audiovolumemute" => VK_VOLUME_MUTE,
        "audiovolumedown" => VK_VOLUME_DOWN,
        "audiovolumeup" => VK_VOLUME_UP,
        _ => {
            if key.len() == 1 {
                let ch = key.chars().next().unwrap();
                if ch.is_ascii_alphabetic() {
                    let upper = ch.to_ascii_uppercase();
                    VIRTUAL_KEY(upper as u16)
                } else if ch.is_ascii_digit() {
                    VIRTUAL_KEY(ch as u16)
                } else {
                    match ch {
                        ';' | ':' => VK_OEM_1,
                        '+' | '=' => VK_OEM_PLUS,
                        ',' | '<' => VK_OEM_COMMA,
                        '-' | '_' => VK_OEM_MINUS,
                        '.' | '>' => VK_OEM_PERIOD,
                        '/' | '?' => VK_OEM_2,
                        '`' | '~' => VK_OEM_3,
                        '[' | '{' => VK_OEM_4,
                        '\\' | '|' => VK_OEM_5,
                        ']' | '}' => VK_OEM_6,
                        '\'' | '"' => VK_OEM_7,
                        _ => VK_SPACE,
                    }
                }
            } else {
                VK_SPACE
            }
        }
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
                        mouseData: (dy * 120.0) as i32 as u32,
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
                        mouseData: (dx * 120.0) as i32 as u32,
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
        let vk = parse_virtual_key(key);
        let mut inputs = Vec::new();

        for m in modifiers {
            let m_vk = match m.to_lowercase().as_str() {
                "ctrl" | "control" => VK_CONTROL,
                "alt" => VK_MENU,
                "shift" => VK_SHIFT,
                "win" | "meta" => VK_LWIN,
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
                let m_vk = match m.to_lowercase().as_str() {
                    "ctrl" | "control" => VK_CONTROL,
                    "alt" => VK_MENU,
                    "shift" => VK_SHIFT,
                    "win" | "meta" => VK_LWIN,
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
        match action {
            "lock" => unsafe {
                let _ = LockWorkStation();
            },
            "sleep" => unsafe {
                let res = SetSuspendState(false, true, false);
                if !res.as_bool() {
                    let _ = std::process::Command::new("rundll32.exe")
                        .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                        .spawn();
                }
            },
            "restart" => {
                let _ = std::process::Command::new("shutdown.exe")
                    .args(["/r", "/t", "0"])
                    .spawn();
            }
            "shutdown" => {
                let _ = std::process::Command::new("shutdown.exe")
                    .args(["/s", "/t", "0"])
                    .spawn();
            }
            _ => return Err(PlatformError::NotSupported(action.to_string())),
        }
        Ok(())
    }
}

#[async_trait]
impl MediaProvider for WindowsNativeProvider {
    async fn media_command(&self, action: &str, value: Option<f32>) -> Result<(), PlatformError> {
        let mut vks = Vec::new();
        match action {
            "play_pause" | "play" | "pause" | "toggle" => vks.push(VK_MEDIA_PLAY_PAUSE),
            "next" => vks.push(VK_MEDIA_NEXT_TRACK),
            "prev" | "previous" => vks.push(VK_MEDIA_PREV_TRACK),
            "volume_up" => vks.push(VK_VOLUME_UP),
            "volume_down" => vks.push(VK_VOLUME_DOWN),
            "mute" | "toggle_mute" => vks.push(VK_VOLUME_MUTE),
            "set_volume" => {
                if let Some(target) = value {
                    let steps = (target * 50.0).round() as usize;
                    for _ in 0..50 {
                        vks.push(VK_VOLUME_DOWN);
                    }
                    for _ in 0..steps {
                        vks.push(VK_VOLUME_UP);
                    }
                }
            }
            _ => return Ok(()),
        }

        for vk in vks {
            let down = INPUT {
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
            };
            let up = INPUT {
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
            };
            unsafe {
                SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32);
            }
        }
        Ok(())
    }

    async fn get_media_state(&self) -> Result<Option<MediaSessionState>, PlatformError> {
        Ok(None)
    }
}

#[async_trait]
impl PresentationProvider for WindowsNativeProvider {
    async fn presentation_command(
        &self,
        action: &str,
        _slide_index: Option<u32>,
    ) -> Result<(), PlatformError> {
        let vk = match action {
            "next" => VK_RIGHT,
            "prev" | "previous" => VK_LEFT,
            "start" | "slideshow_start" => VK_F5,
            "black_screen" => VIRTUAL_KEY(0x42), // 'B'
            "white_screen" => VIRTUAL_KEY(0x57), // 'W'
            "exit" | "stop" => VK_ESCAPE,
            _ => return Ok(()),
        };
        let down = INPUT {
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
        };
        let up = INPUT {
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
        };
        unsafe {
            SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32);
        }
        Ok(())
    }
}

#[async_trait]
impl ClipboardProvider for WindowsNativeProvider {
    async fn get_clipboard_text(&self) -> Result<String, PlatformError> {
        unsafe {
            if OpenClipboard(HWND(0)).is_ok() {
                let handle = GetClipboardData(13); // CF_UNICODETEXT = 13
                if !handle.0.is_null() {
                    let ptr = GlobalLock(handle.0) as *const u16;
                    if !ptr.is_null() {
                        let mut len = 0;
                        while *ptr.add(len) != 0 {
                            len += 1;
                        }
                        let slice = std::slice::from_raw_parts(ptr, len);
                        let text = String::from_utf16_lossy(slice);
                        let _ = GlobalUnlock(handle.0);
                        let _ = CloseClipboard();
                        return Ok(text);
                    }
                }
                let _ = CloseClipboard();
            }
        }
        Ok(String::new())
    }

    async fn set_clipboard_text(&self, text: &str) -> Result<(), PlatformError> {
        unsafe {
            if OpenClipboard(HWND(0)).is_ok() {
                let _ = EmptyClipboard();
                let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
                let bytes_len = wide.len() * std::mem::size_of::<u16>();
                let h_mem = GlobalAlloc(GMEM_MOVEABLE, bytes_len);
                if !h_mem.0.is_null() {
                    let ptr = GlobalLock(h_mem.0) as *mut u16;
                    if !ptr.is_null() {
                        std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
                        let _ = GlobalUnlock(h_mem.0);
                        let _ = SetClipboardData(13, HANDLE(h_mem.0));
                    }
                }
                let _ = CloseClipboard();
                return Ok(());
            }
        }
        Err(PlatformError::ExecutionFailed(
            "Failed to open Windows clipboard".into(),
        ))
    }
}

#[async_trait]
impl WindowManager for WindowsNativeProvider {
    async fn get_windows(&self) -> Result<Vec<WindowInfo>, PlatformError> {
        Ok(vec![])
    }

    async fn window_action(
        &self,
        _window_id: &str,
        action: &str,
        _target_display: Option<u32>,
    ) -> Result<(), PlatformError> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Ok(());
            }

            match action {
                "maximize" => {
                    let _ = ShowWindow(hwnd, SW_MAXIMIZE);
                }
                "minimize" => {
                    let _ = ShowWindow(hwnd, SW_MINIMIZE);
                }
                "restore" => {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                }
                "close" => {
                    let _ = PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
                }
                "snap_left" | "snap_right" => {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                    let h_mon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
                    let mut mon_info = MONITORINFO {
                        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                        rcMonitor: RECT::default(),
                        rcWork: RECT::default(),
                        dwFlags: 0,
                    };
                    if GetMonitorInfoW(h_mon, &mut mon_info).as_bool() {
                        let work = mon_info.rcWork;
                        let work_w = work.right - work.left;
                        let work_h = work.bottom - work.top;
                        let half_w = work_w / 2;

                        let (x, y, w, h) = if action == "snap_left" {
                            (work.left, work.top, half_w, work_h)
                        } else {
                            (work.left + half_w, work.top, half_w, work_h)
                        };

                        let _ = SetWindowPos(hwnd, HWND_TOP, x, y, w, h, SWP_SHOWWINDOW);
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }

    async fn get_foreground_app(&self) -> Result<Option<ForegroundAppState>, PlatformError> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Ok(None);
            }

            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            let title = if len > 0 {
                String::from_utf16_lossy(&title_buf[..len as usize])
            } else {
                String::new()
            };

            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));

            let process_name = if pid > 0 {
                let h_proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
                if let Ok(h) = h_proc {
                    let mut name_buf = [0u16; 512];
                    let mut name_len = name_buf.len() as u32;
                    let success = QueryFullProcessImageNameW(
                        h,
                        PROCESS_NAME_FORMAT(0),
                        PWSTR(name_buf.as_mut_ptr()),
                        &mut name_len,
                    );
                    let _ = CloseHandle(h);
                    if success.is_ok() && name_len > 0 {
                        let full_path = String::from_utf16_lossy(&name_buf[..name_len as usize]);
                        full_path
                            .split(['/', '\\'])
                            .last()
                            .unwrap_or("App.exe")
                            .to_string()
                    } else {
                        "Application".to_string()
                    }
                } else {
                    "Application".to_string()
                }
            } else {
                "Application".to_string()
            };

            let lower = process_name.to_lowercase();
            let category = if lower.contains("spotify")
                || lower.contains("vlc")
                || lower.contains("wmplayer")
                || lower.contains("music")
                || (lower.contains("chrome") && title.to_lowercase().contains("youtube"))
            {
                "media".to_string()
            } else if lower.contains("powerpnt")
                || lower.contains("keynote")
                || title.to_lowercase().contains("presentation")
            {
                "presentation".to_string()
            } else if lower.contains("code") || lower.contains("devenv") || lower.contains("idea") {
                "development".to_string()
            } else {
                "general".to_string()
            };

            Ok(Some(ForegroundAppState {
                process_name,
                window_title: title,
                category,
            }))
        }
    }

    async fn get_displays(&self) -> Result<Vec<DisplayInfo>, PlatformError> {
        Ok(vec![DisplayInfo {
            index: 0,
            name: "Primary Display".to_string(),
            width: 1920,
            height: 1080,
            is_primary: true,
        }])
    }
}

#[async_trait]
impl AppLauncher for WindowsNativeProvider {
    async fn launch_app(&self, app_id: &str) -> Result<(), PlatformError> {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", app_id])
            .spawn();
        Ok(())
    }

    async fn list_apps(&self) -> Result<Vec<AppInfo>, PlatformError> {
        Ok(vec![])
    }
}
