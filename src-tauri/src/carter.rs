use std::io::Write;
use std::os::windows::process::CommandExt;
use futures_util::StreamExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn kill() {
  let processes = [
    "EpicGamesLauncher.exe",
    "FortniteLauncher.exe",
    "FortniteClient-Win64-Shipping.exe",
    "EpicWebHelper.exe",
  ];

  for process in processes.iter() {
    let _ = std::process::Command::new("cmd")
      .creation_flags(CREATE_NO_WINDOW)
      .args(["/C", "taskkill", "/F", "/IM", process])
      .spawn();
  }

  std::thread::sleep(std::time::Duration::from_millis(10));
}

pub fn search() -> u32 {
  let mut pid = 0;
  let tl = unsafe { tasklist::Tasklist::new() };
  for task in tl {
    if task.get_pname() == "FortniteClient-Win64-Shipping.exe" {
      pid = task.get_pid();
      break;
    }
  }
  pid
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DownloadProgress {
  pub file_name: String,
  pub wanted_file_size: u64,
  pub downloaded_file_size: u64,
  pub download_speed: u128,
}

async fn downloader(
  client: reqwest::Client,
  url: &str,
  path: &str,
  window: &tauri::Window,
) -> Result<(), String> {
  let response: reqwest::Response = client
    .get(url)
    .send()
    .await
    .or(Err("Failed to send request".to_string()))?;
  if !response.status().is_success() {
    return Err(format!(
      "Failed to download '{}' for reason '{}'",
      url,
      response.status().to_string()
    ));
  }
  let wal = response.content_length().unwrap_or(0);
  let mut file_name = url.split('/').last().unwrap_or("download").to_string();
  if file_name.contains("idols") {
    file_name = "idols launcher".to_string();
  }

  let mut file =
    std::fs::File::create(path).or(Err(format!("Failed to create file '{}'", path)))?;
  let mut stream = response.bytes_stream();

  let mut progress = DownloadProgress {
    file_name: file_name.clone(),
    wanted_file_size: wal,
    downloaded_file_size: 0,
    download_speed: 0,
  };
  let last_time = std::time::Instant::now();

  while let Some(chunk) = stream.next().await {
    let chunk = chunk.unwrap();
    file
      .write_all(&chunk)
      .or(Err(format!("Failed to write to file '{}'", path)))?;

    progress.downloaded_file_size += chunk.len() as u64;
    let elapsed = last_time.elapsed().as_secs();
    if elapsed > 0 {
      progress.download_speed = progress.downloaded_file_size as u128 / elapsed as u128;
    }

    window.emit("download_progress", progress.clone()).unwrap();
  }

  Ok(())
}

pub async fn download(
  url: &str,
  file: &str,
  path: &str,
  window: &tauri::Window,
) -> Result<bool, String> {
  let client = reqwest::Client::new();
  let file_url = format!("{}/{}", url, file);
  downloader(client, &file_url, path, window).await?;
  Ok(true)
}

pub async fn delete(path: &str) -> Result<bool, String> {
  let path2 = std::path::PathBuf::from(path);
  if path2.exists() {
    std::fs::remove_file(path)
      .or(Err(format!("Failed to delete '{}'", path2.to_string_lossy())))?;
  }
  Ok(true)
}

/// Lance Fortnite sans anti-cheat (pas de Retrac_EAC / EasyAntiCheat).
pub async fn launch_game(path: &str, extra_args: &str) -> Result<bool, String> {
  let base = std::path::PathBuf::from(path);
  let mut binary = base.clone();
  binary.push("FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe");

  if !binary.exists() {
    return Err("FortniteClient-Win64-Shipping.exe introuvable dans ce dossier.".to_string());
  }

  let mut cwd = base.clone();
  cwd.push("FortniteGame\\Binaries\\Win64");

  let fort_args = vec![
    "-epicapp=Fortnite",
    "-epicenv=Prod",
    "-epiclocale=en-us",
    "-epicportal",
    "-nobe",
    "-skippatchcheck",
    "-noeac",
  ];

  let mut cmd = std::process::Command::new(&binary);
  cmd.creation_flags(CREATE_NO_WINDOW)
    .current_dir(&cwd)
    .args(&fort_args)
    .args(extra_args.split_whitespace());

  cmd.env("OPENSSL_ia32cap", "~0x20000000");

  if cmd.spawn().is_err() {
    return Err(format!(
      "Échec du lancement de {}",
      binary.to_string_lossy()
    ));
  }

  Ok(true)
}
