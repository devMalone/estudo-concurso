@echo off
title Sincronização Supabase - Concurso BACEN
chcp 65001 > nul

echo ==============================================================================
echo    SINCRONIZAÇÃO DE DADOS LOCAIS -> SUPABASE POSTGRESQL
echo ==============================================================================
echo.
echo Lembre-se: Caso veja mensagem de "violates row-level security policy",
echo execute o comando de desativar RLS no SQL Editor do Supabase conforme
echo indicado em docs/SUPABASE_SETUP.md.
echo.
echo Iniciando sincronização...
echo.

npm run sync:supabase

echo.
pause
