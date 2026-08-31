# Product Scope Anchor — Mobile PC Companion for Windows

Dokumen ini menjaga keputusan produk saat executor tidak memiliki attachment percakapan asli. Ia bukan tracker; status tetap hanya di [README](README.md).

## North star

Produk adalah Mobile PC Companion untuk Windows, bukan clone desktop dan bukan hanya remote mouse. Pengguna utama adalah pemilik laptop/PC pribadi—terutama mahasiswa—yang mengontrol laptop dari kasur/sofa, saat presentasi, ketika memakai TV/monitor, atau ketika tidak ingin kembali ke keyboard/mouse. Trackpad adalah fitur inti dan selalu cepat diakses.

## Navigation and control

- Aplikasi selalu membuka `Control` dengan trackpad langsung tersedia.
- Bottom navigation horizontal: Control, Keyboard, Apps, Panels, Clipboard, Files, Media, Slides, System. Tidak ada tab `More`; urutan dapat dipersonalisasi.
- Header kecil: PC aktif/status, Search, Quick Actions, Settings. Nama PC membuka switcher/pairing.
- Control terdiri dari Context dan Trackpad yang dapat di-resize, snap, reset, dan pin. Context berada di atas, bukan menutupi trackpad. Enlarged Trackpad tetap mempertahankan navigation.
- App-aware behavior memberi saran/initial size tetapi tidak memaksa tab atau mode dan selalu tunduk pada pin/override pengguna.

## Input model

- Satu jari: cursor; tap: left click. Dua-jari tap: right click. Dua-jari pinch: zoom. Double-tap+drag: drag. Click bars kiri/kanan tetap ada tetapi tipis.
- Dua-jari drag bukan default scroll. Scrolling utama memakai Side Pad.
- Side Pad adalah touch surface sempit, bukan scrollbar; dapat di kiri/kanan, lebarnya dapat diatur, dan 1–6 jari bermakna sama. Mode: Scroll, Volume, Zoom, Custom.
- Gesture 3/4 jari mengikuti setting Windows bila terbukti dapat dibaca, lalu fallback Windows-like, lalu manual mapping. Gesture 5/6 jari tersedia untuk custom tanpa default.
- Keyboard mempertahankan text/modifier/navigation/D-pad/Space dan menambahkan Mini Trackpad + Side Pad permanen.

## Companion modes

- Apps menggabungkan pinned launchers, running windows, monitor manager, dan virtual desktops. Window cards menampilkan data/thumbnail live berfrekuensi rendah dan mendukung focus/min/max/close/snap/move.
- Monitor Preview hanya untuk identifikasi, berbeda dari future Remote View. Display detail berisi info, cursor target, move active window, dan settings link/action.
- Universal Search memakai provider untuk apps, windows, allowed files, system/custom actions, panels, dan recents. PowerToys/Everything hanya provider opsional.
- Media memiliki compact Control context dan dedicated tab. Slides memiliki slide controls, timer, software pointer, Trackpad, dan Side Pad.
- Quick Actions berisi pinned/recent/contextual tanpa AI.
- Custom Panels V1 adalah grid terbatas dengan Button, Toggle, Slider, D-Pad, Text Input, App Launcher, dan pointer-related widgets. Interaksi hanya Tap/Hold; bukan editor freeform.
- Clipboard dua arah memiliki bounded history, pause, dan auto-clear. File Companion hanya melihat whitelisted roots dan mendukung transfer dua arah dengan progress/cancel/conflict/security limits.
- System mencakup status yang benar-benar didukung, audio/display/connectivity/settings, serta Lock/Sleep/Restart/Shutdown. Perintah destruktif memakai hold-to-confirm.

## Architecture rules

- Semua capability pengguna memakai canonical Action: `UI → Action → Dispatcher → protected transport → Windows router → platform adapter`.
- High-rate pointer stream boleh memakai lane khusus, tetapi tetap authenticated/authorized/bounded.
- Windows companion adalah host utama; protokol tidak bergantung pada React sehingga PWA dan future React Native berbagi contract.
- LAN-first, satu active PC pada satu waktu, data model multi-PC sejak awal. Pairing memakai discovery/QR/short code dengan manual host/IP hanya sebagai advanced fallback.
- Pairing authenticated, session protected, identity per device, permissions fail closed, file roots whitelisted, dan destructive/private capabilities terpisah.

## Release boundaries

- MVP: secure pairing/transport, shell/navigation, Control/Trackpad/Side Pad, Keyboard, Media, Slides, Clipboard, System, and reliable Windows companion.
- v1.0: Apps/windows/displays/desktops, pinned apps, Search, Context, adaptive Control, Quick Actions, and configurable 3/4-finger gestures.
- v1.1: Custom Panels and deeper personalization.
- v1.2: complete File Companion.
- Later only after evidence: PowerToys/Everything, richer monitor/presentation/gyro, React Native, Remote View, and internet relay.

## Non-negotiable product rules

- Never require a dashboard visit before cursor control.
- Never copy Windows desktop 1:1 onto a phone; design for thumb reach and touch.
- Never let context automation repeatedly take control from the user.
- Never present monitor preview as remote desktop.
- Never make optional integrations mandatory.
- Stabilize LAN reliability, protocol, and UX before native migration or remote internet access.
