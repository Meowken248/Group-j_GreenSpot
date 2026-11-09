@echo off
echo ===================================================
echo   DEMO TIM KIEM USER VOI ELASTICSEARCH (PHP + ES)
echo ===================================================
echo Dang khoi dong Web Server tai http://localhost:8090 ...
echo Mo trinh duyet va truy cap: http://localhost:8090/user_list.php
echo Nhan Ctrl + C de dung server.
echo ===================================================
php -S localhost:8090 -t "%~dp0"
pause

