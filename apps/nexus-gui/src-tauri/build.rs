//! Build script for the Tauri application
//!
//! Configures library paths for Npcap SDK on Windows

use std::{env, fs, path::Path};

fn ensure_frontend_dist_exists() {
    // `tauri::generate_context!()` requires build.frontendDist to exist even for `cargo check`.
    // Create a minimal placeholder so editor diagnostics and local checks stay stable.
    let Some(manifest_dir) = env::var_os("CARGO_MANIFEST_DIR") else {
        return;
    };

    let dist_dir = Path::new(&manifest_dir).join("../dist");
    if dist_dir.exists() {
        return;
    }

    if let Err(error) = fs::create_dir_all(&dist_dir) {
        println!(
            "cargo:warning=Failed to create frontend dist placeholder at {}: {}",
            dist_dir.display(),
            error
        );
        return;
    }

    let placeholder = dist_dir.join("index.html");
    let placeholder_html = "<!doctype html><html><body>NEXUS GUI build placeholder</body></html>";
    if let Err(error) = fs::write(&placeholder, placeholder_html) {
        println!(
            "cargo:warning=Failed to write frontend dist placeholder file {}: {}",
            placeholder.display(),
            error
        );
        return;
    }

    println!(
        "cargo:warning=Created placeholder frontend dist at {} (run `npm --prefix apps/nexus-gui run build` for production assets)",
        dist_dir.display()
    );
}

fn main() {
    ensure_frontend_dist_exists();

    // Tauri build setup
    tauri_build::build();

    // Configure Npcap SDK path for Windows
    // The Npcap SDK is required for pnet crate to work on Windows
    #[cfg(target_os = "windows")]
    {
        // Try common Npcap SDK locations
        let possible_paths = [
            "C:\\npcap-sdk\\Lib\\x64",
            "C:\\Program Files\\Npcap\\SDK\\Lib\\x64",
            "C:\\Npcap SDK\\Lib\\x64",
        ];

        for path in &possible_paths {
            if std::path::Path::new(path).exists() {
                println!("cargo:rustc-link-search=native={}", path);
                return;
            }
        }

        // If not found in common locations, check environment variable
        if let Ok(npcap_path) = std::env::var("NPCAP_SDK") {
            println!("cargo:rustc-link-search=native={}\\Lib\\x64", npcap_path);
        } else {
            // Print warning but still try to link
            println!(
                "cargo:warning=Npcap SDK not found. Please install Npcap SDK and set NPCAP_SDK environment variable."
            );
            println!("cargo:warning=Download from: https://npcap.com/#download");

            // Try the user's path as fallback
            println!("cargo:rustc-link-search=native=C:\\npcap-sdk\\Lib\\x64");
        }
    }
}
