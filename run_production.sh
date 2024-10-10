#!/bin/bash

APP_NAME="whatsapp-bot"
SCRIPT_NAME="index.js"

# Fungsi untuk menampilkan penggunaan
usage() {
  echo "Usage: sh run_production.sh {start|stop|restart|status}"
  exit 1
}

# Fungsi untuk menjalankan aplikasi dengan PM2
start() {
  echo "Starting $APP_NAME..."
  pm2 start $SCRIPT_NAME --name $APP_NAME --env production
}

# Fungsi untuk menghentikan aplikasi
stop() {
  echo "Stopping $APP_NAME..."
  pm2 stop $APP_NAME
}

# Fungsi untuk me-restart aplikasi
restart() {
  echo "Restarting $APP_NAME..."
  pm2 restart $APP_NAME
}

# Fungsi untuk menampilkan status aplikasi
status() {
  echo "Status for $APP_NAME:"
  pm2 status $APP_NAME
}

# Mengecek argumen dan menjalankan fungsi yang sesuai
case "$1" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  *) usage ;;
esac
