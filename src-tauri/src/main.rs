#![cfg_attr(
  all(not(debug_assertions), target_os = "linux"),
  windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::{path::Path, fs, string::String, collections::HashMap, thread};

#[derive(Deserialize, Serialize)]
struct Info<'a> {
  brightness: &'a str,
  color_left: &'a str,
  color_center: &'a str,
  color_right: &'a str,
  color_extra: &'a str,
  mode: &'a str,
  state: &'a str,
}

static ROOT_PATH: &str = "/sys/devices/platform/tuxedo_keyboard/";
static INFO_TEMPLATE: Info = Info { brightness: "", color_center: "", color_extra: "", color_left: "", color_right: "", mode: "", state: "" };
static NEED_TO_CONVERT_ATTR: &'static [&'static str] = &["color_center", "color_extra", "color_left", "color_right"];

fn read_file(path: String) -> thread::Result<String> {
  return thread::spawn(|| {
    fs::read_to_string(path).unwrap()
  }).join();
}

fn write_file(path: String, content: String) -> thread::Result<()> {
  return thread::spawn(|| {
    fs::write(path, content).unwrap()
  }).join();
}

#[tauri::command]
fn check_tuxedo_module_exist() -> bool {
  return Path::new(ROOT_PATH).exists();
}

#[tauri::command]
fn read_tuxedo_config() -> (HashMap<String, String>, bool) {
  //? iter: 0: name of value (which is also the name of file to read); 1: value
  let iter: HashMap<String, String> = serde_json::from_value(serde_json::to_value(&INFO_TEMPLATE).unwrap()).unwrap();
  let mut config: HashMap<String, String> = HashMap::new();
  let mut success = true;

  for i in &iter {
    //? full path: root + config name (which also act as file name)
    let full_path = ROOT_PATH.to_owned() + i.0;

    match read_file(full_path) {
      Ok(contents) => {
        let mut new_contents = contents.clone();
        if NEED_TO_CONVERT_ATTR.contains(&i.0.as_str()) {
          new_contents = "0x".to_owned() + &contents;
        }
        config.insert(i.0.to_string(), new_contents);
      }
      Err(_) => {
        success = false;
        println!("FAIL: Unable to read config!");
        break;
      }
    }
  }
  return (config, success);
}

#[tauri::command]
fn write_tuxedo_config(prev_info: Info<'_>, info: Info<'_>) -> bool {
  let iter: HashMap<String, String> = serde_json::from_value(serde_json::to_value(&info).unwrap()).unwrap();
  let prev_iter: HashMap<String, String> = serde_json::from_value(serde_json::to_value(&prev_info).unwrap()).unwrap();
  let mut success = true;

  for i in &iter {
    //? only update config which have changed
    match prev_iter.get(&(i.0.to_string())) {
      Some(data) => {
        if data == i.1 {
          continue
        }
      },
      _ => (),
    }

    let full_path = ROOT_PATH.to_owned() + i.0;

    match write_file(full_path, i.1.to_string()) {
      Ok(_) => {
        success = true
      }
      Err(_) => {
        success = false;
        println!("FAIL: Unable to write config!");
        break;
      }
    }
  }

  return success;
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![check_tuxedo_module_exist, read_tuxedo_config, write_tuxedo_config])
    .run(tauri::generate_context!())
    .expect("Error: Unable to run Tuxedo Keyboard Controller");
}
