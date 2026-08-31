use platform_mock::MockPlatform;
use remote_core::{RemoteServer, ServerState};
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    info!("Starting PC Companion Remote Server on port 8080...");

    let mock = Arc::new(MockPlatform::new());

    #[cfg(windows)]
    let (input_p, power_p, media_p, pres_p) = {
        let win = Arc::new(platform_windows::WindowsNativeProvider::new());
        info!("Running on Windows platform: Native Win32 SendInput, Media & Power enabled");
        (
            win.clone() as Arc<dyn remote_protocol::traits::InputProvider>,
            win.clone() as Arc<dyn remote_protocol::traits::PowerProvider>,
            win.clone() as Arc<dyn remote_protocol::traits::MediaProvider>,
            win.clone() as Arc<dyn remote_protocol::traits::PresentationProvider>,
        )
    };

    #[cfg(not(windows))]
    let (input_p, power_p, media_p, pres_p) = {
        info!("Running in non-Windows environment: MockPlatform enabled");
        (
            mock.clone() as Arc<dyn remote_protocol::traits::InputProvider>,
            mock.clone() as Arc<dyn remote_protocol::traits::PowerProvider>,
            mock.clone() as Arc<dyn remote_protocol::traits::MediaProvider>,
            mock.clone() as Arc<dyn remote_protocol::traits::PresentationProvider>,
        )
    };

    let state = ServerState::new_with_providers(
        input_p,
        media_p,
        pres_p,
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        power_p,
    );

    // Seed a pairing token for dev/testing
    let dev_token = state.auth_manager.lock().unwrap().generate_pairing_token(3600);
    info!("--------------------------------------------------");
    info!("Dev Pairing Token: {}", dev_token);
    info!("Connect via PWA and enter this pairing token or scan QR");
    info!("--------------------------------------------------");

    let server = RemoteServer::new(state, 8080);
    server.run().await?;

    Ok(())
}
