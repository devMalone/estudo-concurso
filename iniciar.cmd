@echo off
title Preparação Concurso BACEN - Técnico Suporte Técnico-Administrativo
chcp 65001 > nul

echo ==============================================================================
echo    APLICATIVO DE PREPARAÇÃO - CONCURSO BANCO CENTRAL DO BRASIL (BACEN)
echo    Cargo: Técnico do Banco Central - Área 1: Suporte Técnico-Administrativo
echo ==============================================================================
echo.
echo [1/2] Iniciando Backend API (porta 3001) e Frontend React (porta 5173)...
echo [2/2] Abrindo navegador automaticamente em http://localhost:5173 ...
echo.

start "" "http://localhost:5173"

npm run dev

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [AVISO] Ocorreu um erro ao executar npm run dev.
  pause
)
