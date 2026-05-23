#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Window, WindowEvent};
use window_shadows::set_shadow;
use std::path::PathBuf;
use sha2::Digest;

mod carter;

#[tauri::command]
async fn hash(i: String) -> Result<String, String> {
  let i = std::path::PathBuf::from(i);
  if !i.exists() {
    return Err("File ".to_string() + i.to_str().unwrap() + " does not exist");
  }

  let bytes = std::fs::read(i).unwrap();
  let hash = sha2::Sha256::digest(bytes.as_slice());
  return Ok(format!("{:x}", hash));
}

#[tauri::command]
async fn exists(i: &str) -> Result<bool, String> {
  Ok(std::path::Path::new(i).exists())
}

#[tauri::command]
async fn size(i: &str) -> Result<u64, String> {
  let metadata = std::fs::metadata(i);
  if metadata.is_err() {
    return Err("Could not get metadata".to_string());
  }

  Ok(metadata.unwrap().len())
}

#[tauri::command]
async fn experience(
  i: String,
  c: &str,
  _local: bool,
  _edit_on_release: bool,
  _disable_pre_edit: bool,
  _version: i32,
  backend_host: &str,
  backend_port: u16,
  _app: AppHandle,
) -> Result<bool, String> {
  carter::kill();
  let path = PathBuf::from(i);

  let launch_args = format!(
    "-AUTH_LOGIN= -AUTH_PASSWORD={} -AUTH_TYPE=exchangecode -BackendHost={} -BackendPort={}",
    c, backend_host, backend_port
  );

  match carter::launch_game(path.to_str().unwrap(), &launch_args).await {
    Ok(_) => Ok(true),
    Err(e) => Err("Could not launch Fortnite: ".to_string() + e.as_str()),
  }
}

#[tauri::command]
async fn offline(
  i: String,
  username: &str,
  backend_host: &str,
  backend_port: u16,
) -> Result<bool, String> {
  carter::kill();
  let path = PathBuf::from(i);

  let launch_args = format!(
    "-AUTH_LOGIN={}@idols.local -AUTH_PASSWORD=snowsOnTop -AUTH_TYPE=epic -BackendHost={} -BackendPort={}",
    username, backend_host, backend_port
  );

  match carter::launch_game(path.to_str().unwrap(), &launch_args).await {
    Ok(_) => Ok(true),
    Err(e) => Err("Could not launch the game: ".to_string() + e.as_str()),
  }
}

#[tauri::command]
async fn kill() {
  carter::kill();
}

#[tauri::command]
async fn download(url: &str, file: &str, out_path: &str, app: AppHandle) -> Result<bool, String> {
  let window = app.get_window("main").unwrap();
  match carter::download(url, file, out_path, &window).await {
    Ok(_) => {},
    Err(e) => {
      return Err("Could not download the file for reason: ".to_string() + e.as_str());
    }
  }
  Ok(true)
}

#[tauri::command]
async fn download_url(url: String, dest_path: String, app: AppHandle) -> Result<bool, String> {
  let window = app.get_window("main").unwrap();
  let client = reqwest::Client::new();
  match carter::downloader(client, &url, &dest_path, &window).await {
    Ok(_) => Ok(true),
    Err(e) => Err(e),
  }
}

#[tauri::command]
async fn run_installer_update(installer_path: String) -> Result<(), String> {
  let path = std::path::PathBuf::from(&installer_path);
  if !path.exists() {
    return Err(format!("Installateur introuvable : {}", installer_path));
  }

  std::process::Command::new(&installer_path)
    .args([
      "/VERYSILENT",
      "/SUPPRESSMSGBOXES",
      "/NORESTART",
      "/CLOSEAPPLICATIONS",
      "/SP-",
    ])
  .spawn()
  .map_err(|e| format!("Impossible de lancer la mise à jour : {e}"))?;

  std::thread::sleep(std::time::Duration::from_millis(400));
  std::process::exit(0);
}

#[tauri::command]
async fn delete(path: &str) -> Result<bool, String> {
  match carter::delete(path).await {
    Ok(_) => {},
    Err(e) => {
      return Err("Could not delete the file for reason: ".to_string() + e.as_str());
    }
  }

  Ok(true)
}

fn lam(window: Window) {
  std::thread::spawn(move || {
    loop {
      window.emit("fortnite_process_id", carter::search()).unwrap();
      std::thread::sleep(std::time::Duration::from_millis(100));
    }
  });
}

fn main() {
  tauri_plugin_deep_link::prepare("hqnata.idols.launcher");
  tauri::Builder::default()
    .setup(|app| {
      let window = app.get_window("main").unwrap();
      lam(window.clone());
      set_shadow(window.clone(), true).expect("Unsupported platform!");

      // #[cfg(target_os = "windows")]
      // apply_blur(&window, Some((18, 18, 18, 125))).expect("Unsupported platform! 'apply_blur' is only supported on Windows");

      tauri_plugin_deep_link::register("idols.launcher", move |request| {
        if window.set_focus().is_err() {
          return;
        }
        let uri = request.as_str();
        if uri.contains("idols.launcher://auth") {
          let _ = window.emit("idols-launcher-auth", uri);
        }
      })
      .unwrap();


      Ok(())
    })
    .on_window_event(move |event| match event.event() {
      WindowEvent::Destroyed => {
        carter::kill();
      }
      WindowEvent::Resized(..) => std::thread::sleep(std::time::Duration::from_millis(1)),
      _ => {}
    })
    .invoke_handler(tauri::generate_handler![
      hash,
      exists,
      experience,
      kill,
      offline,
      size,
      download,
      download_url,
      run_installer_update,
      delete
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
