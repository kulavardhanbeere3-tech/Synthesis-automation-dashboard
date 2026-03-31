# Yosys Installation Guide

If Docker images are not available or failing, you can install Yosys locally.

## Windows Installation

### Option 1: Using Chocolatey (Recommended)
```bash
# Install Chocolatey first if you don't have it
# Then install Yosys
choco install yosys
```

### Option 2: Using MSYS2
```bash
# Install MSYS2 from https://www.msys2.org/
# Then in MSYS2 terminal:
pacman -S mingw-w64-x86_64-yosys
```

### Option 3: Manual Installation
1. Download Yosys from: https://github.com/YosysHQ/yosys/releases
2. Extract to a directory (e.g., `C:\yosys`)
3. Add `C:\yosys` to your PATH environment variable

## Linux Installation

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install yosys
```

### CentOS/RHEL/Fedora:
```bash
# CentOS/RHEL
sudo yum install yosys

# Fedora
sudo dnf install yosys
```

### Arch Linux:
```bash
sudo pacman -S yosys
```

## macOS Installation

### Using Homebrew:
```bash
brew install yosys
```

## Verify Installation

After installation, verify Yosys is working:
```bash
yosys --version
```

You should see output like:
```
Yosys 0.9+4052 (git sha1 7c272fc9, gcc 8.3.1 -fPIC -Os)
```

## Troubleshooting

1. **If you get "command not found"**: Make sure Yosys is in your PATH
2. **If you get permission errors**: Try running with sudo (Linux/macOS)
3. **If Docker is still preferred**: Make sure Docker is running and has internet access

## Alternative: Use the Test Script

Run the provided test script to check if Yosys is working:
```bash
python test_yosys.py
```

This will test both Docker and local Yosys installations. 