@echo off
title Testes de Regras de Negocio - Concurso BACEN
chcp 65001 > nul

echo ==============================================================================
echo    TESTES AUTOMATIZADOS DE REGRAS CRÍTICAS DO EDITAL BACEN
echo    (Revisões 7/15/30d, Manutenção Pós-30d, Taxa Ponderada e CESPE)
echo ==============================================================================
echo.

npm test

echo.
pause
