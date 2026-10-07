export const fgenReleases = "https://github.com/prophesourvolodymyr/fuckinggen/releases/latest";

// Shared by the product page and docs; commands match the published packages.
export const fgenInstall = [
  {
    id: "macos",
    label: "macOS",
    icon: "platform-apple.svg",
    command: "brew tap prophesourvolodymyr/fuckinggen\nbrew install fuckinggen",
  },
  {
    id: "linux",
    label: "Linux / AUR",
    icon: "platform-linux.svg",
    command: "yay -S fgen",
  },
  {
    id: "windows",
    label: "Windows",
    icon: "platform-windows.svg",
    command: [
      '$release = Invoke-RestMethod "https://api.github.com/repos/prophesourvolodymyr/fuckinggen/releases/latest"',
      '$asset = $release.assets | Where-Object name -Like "*-x86_64-pc-windows-*.zip" | Select-Object -First 1',
      'Invoke-WebRequest $asset.browser_download_url -OutFile "$env:TEMP\\fgen.zip"',
      'Expand-Archive "$env:TEMP\\fgen.zip" -DestinationPath "$env:LOCALAPPDATA\\fgen" -Force',
      '$bin = (Get-ChildItem "$env:LOCALAPPDATA\\fgen" -Filter fgen.exe -Recurse | Select-Object -First 1).DirectoryName',
      '$env:Path += ";$bin"',
      '[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$bin", "User")',
      'fgen --version',
    ].join("\n"),
  },
  {
    id: "source",
    label: "From source",
    icon: "platform-linux.svg",
    command: "cargo install --git https://github.com/prophesourvolodymyr/fuckinggen --locked",
  },
] as const;
