#!/bin/sh
wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

