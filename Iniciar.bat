@echo off
setlocal
title Contabilizador de Comissoes Dental Plus

set "ARCH=x64"
if /I "%PROCESSOR_ARCHITECTURE%"=="x86" set "ARCH=ia32"
set "APP_DIR=win-unpacked"
if "%ARCH%"=="ia32" set "APP_DIR=win-ia32-unpacked"
set "APP=%~dp0release\%APP_DIR%\Contabilizador de Comissoes Dental Plus.exe"

if not exist "%APP%" (
  echo Executavel nao encontrado: %APP%
  echo Execute Compilar.bat ou consulte LEIA-ME.txt.
  pause
  exit /b 1
)

start "" "%APP%"
