// Windows Input helpers for SendInput API mapping

#[derive(Debug, Clone, Copy)]
pub enum WinMouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Copy)]
pub enum WinButtonState {
    Down,
    Up,
    Click,
    DoubleClick,
}
