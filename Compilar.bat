@echo off
title Compilar Frontend - Juntador de Comissoes

echo Mapeando temporariamente a unidade de rede Z:...
net use Z: "\\192.168.0.28\Financeiro" /y >nul 2>&1

if exist Z:\ (
    echo Iniciando instalacao e compilacao na unidade Z:...
    Z:
    cd "Z:\LUCAS\PROJETOS\CONTABILIZADOR DE COMISSÕES\COMISS-O-main"
    call npm install --no-audit --no-fund --legacy-peer-deps
    call npm run build:frontend
    echo Desconectando a unidade Z:...
    net use Z: /delete /y >nul 2>&1
) else (
    echo [AVISO] Nao foi possivel mapear a unidade Z:. Tentando executar direto...
    cd /d "%~dp0"
    call npm install --no-audit --no-fund --legacy-peer-deps
    call npm run build:frontend
)
echo.
echo Processo concluido!
pause
