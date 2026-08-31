pub mod input;

#[cfg(windows)]
pub mod win32_impl;

#[cfg(windows)]
pub use win32_impl::WindowsNativeProvider;

pub struct WindowsPlatform;

impl WindowsPlatform {
    pub fn new() -> Self {
        Self
    }
}

#[cfg(not(windows))]
mod fallback {
    use super::*;
    use async_trait::async_trait;
    use remote_protocol::traits::*;

    #[async_trait]
    impl InputProvider for WindowsPlatform {
        async fn pointer_move_relative(&self, _dx: f32, _dy: f32) -> Result<(), PlatformError> {
            Err(PlatformError::NotSupported("Windows only".into()))
        }
        async fn pointer_button(&self, _b: &str, _s: &str) -> Result<(), PlatformError> {
            Err(PlatformError::NotSupported("Windows only".into()))
        }
        async fn pointer_scroll(&self, _dx: f32, _dy: f32) -> Result<(), PlatformError> {
            Err(PlatformError::NotSupported("Windows only".into()))
        }
        async fn key_action(&self, _k: &str, _s: &str, _m: &[String]) -> Result<(), PlatformError> {
            Err(PlatformError::NotSupported("Windows only".into()))
        }
        async fn text_stream(&self, _t: &str) -> Result<(), PlatformError> {
            Err(PlatformError::NotSupported("Windows only".into()))
        }
        async fn release_all_inputs(&self) -> Result<(), PlatformError> {
            Ok(())
        }
    }
}
