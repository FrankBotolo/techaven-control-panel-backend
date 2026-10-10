#!/bin/sh
set -eu

node scripts/bootstrap-database.js
exec node server.js
