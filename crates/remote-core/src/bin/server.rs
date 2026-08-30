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
    let state = ServerState::new_with_providers(
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
        mock.clone(),
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
