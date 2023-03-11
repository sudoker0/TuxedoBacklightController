# Better Tuxedo Keyboard Backlight Controller
A minimal UI to control the backlight of Tuxedo/Clevo compatible keyboard.
![Screenshot of the program](./screenshot.png)

## I. Why is it better?
 - It's bundled in an AppImage (which you can find in th Releases page) so you don't have to install any package.
 - It have a simple but clean UI.
 - It give you more control like the brightness or the backlight color which you can pick from over 16.7 million different colors.

## II. How to use?
 - Download the AppImage from the Releases page
 - Run it
 - That's it.

## III. Build
### 1. Dependencies
- NodeJS ([https://nodejs.org/en/](https://nodejs.org/en/))
- Rust ([https://www.rust-lang.org/](https://www.rust-lang.org/))
  - Rustup
  - Cargo

### 2. Steps to build
- Clone the repository
```bash
git clone https://github.com/QuanMCPC/TuxedoBacklightController
cd TuxedoBacklightController
```

- Install required `npm` dependencies
```bash
npm install
```

- If you want to directly run the program for debugging purposes:
```bash
npm run tauri dev
```

- OR if you want to build the program:
```bash
npm run tauri build
```

## IV. Contribute
PR and Issues are always welcome. Although don't expect active development or quick responses since I have to study a lot these days.

## V. Licenses
Released under MIT License