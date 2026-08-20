#!/bin/bash
set -e

export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-beever_root}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-beever}"
export MYSQL_USER="${MYSQL_USER:-beever}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-beever}"

export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3306}"
export DB_USER="${DB_USER:-$MYSQL_USER}"
export DB_PASSWORD="${DB_PASSWORD:-$MYSQL_PASSWORD}"
export DB_NAME="${DB_NAME:-$MYSQL_DATABASE}"
export PORT="${PORT:-3000}"
export SESSION_SECRET="${SESSION_SECRET:-$(head -c 48 /dev/urandom | base64 | tr -d '\n')}"
export NODE_ENV="${NODE_ENV:-production}"

DATADIR=/var/lib/mysql
MARCA_INICIALIZADO="$DATADIR/.beever_inicializado"

esperar_mysql() {
  for _ in $(seq 1 120); do
    if mysqladmin ping --silent 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if [ ! -f "$MARCA_INICIALIZADO" ]; then
  echo "primeira subida, inicializando o datadir do MySQL"
  chown -R mysql:mysql "$DATADIR"
  mysqld --initialize-insecure --user=mysql --datadir="$DATADIR" >/tmp/mysql_init.log 2>&1

  mkdir -p /var/run/mysqld
  chown mysql:mysql /var/run/mysqld

  mysqld --user=mysql --log-bin-trust-function-creators=1 >/var/log/mysqld.log 2>&1 &
  mysql_pid=$!

  if ! esperar_mysql; then
    echo "o MySQL nao subiu na inicializacao, log abaixo"
    cat /var/log/mysqld.log
    exit 1
  fi

  echo "criando banco e usuario"
  mysql -uroot <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL

  touch "$MARCA_INICIALIZADO"
  mysqladmin -uroot -p"$MYSQL_ROOT_PASSWORD" shutdown >/dev/null 2>&1 || true
  wait "$mysql_pid" 2>/dev/null || true
fi

echo "ligando o MySQL em segundo plano"
mysqld --user=mysql --log-bin-trust-function-creators=1 >/var/log/mysqld.log 2>&1 &
mysql_pid=$!

if ! esperar_mysql; then
  echo "o MySQL nao subiu, log abaixo"
  cat /var/log/mysqld.log
  exit 1
fi

echo "aplicando as migrations"
DB_USER=root DB_PASSWORD="$MYSQL_ROOT_PASSWORD" npm run db:migrate

echo "carregando os dados de exemplo"
NODE_ENV=development npm run db:seed

echo "Beever no ar em http://localhost:${PORT}"
exec npm start