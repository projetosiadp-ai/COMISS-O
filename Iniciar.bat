@echo off
title Juntador de Comissoes Dental Plus - Alpha

echo Mapeando temporariamente a unidade de rede Z:...
net use Z: "\\192.168.0.28\Financeiro" /y >nul 2>&1

if exist Z:\ (
    echo Iniciando o aplicativo na unidade Z:...
    Z:
    cd "Z:\LUCAS\PROJETOS\CONTABILIZADOR DE COMISSÕES\COMISS-O-main"
    call npm start
    echo Desconectando a unidade Z:...
    net use Z: /delete /y >nul 2>&1
) else (
    echo [AVISO] Nao foi possivel mapear a unidade Z:. Tentando executar direto...
    cd /d "%~dp0"
    call npm start
)
