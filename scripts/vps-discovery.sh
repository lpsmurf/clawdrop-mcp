#!/bin/bash

# VPS Discovery Script
# Run on each VPS to collect system information
# Usage: ssh root@<ip> < vps-discovery.sh

set -e

echo "=== VPS DISCOVERY REPORT ===" > /tmp/vps_discovery.txt
echo "Timestamp: $(date)" >> /tmp/vps_discovery.txt
echo "" >> /tmp/vps_discovery.txt

echo "1. SYSTEM INFO"
echo "--- System Info ---" >> /tmp/vps_discovery.txt
{
  echo "Hostname: $(hostname)"
  echo "OS: $(uname -a)"
  echo "Memory: $(free -h | grep Mem)"
  echo "Disk: $(df -h / | tail -1)"
  echo "CPUs: $(nproc)"
  echo "Uptime: $(uptime)"
} >> /tmp/vps_discovery.txt

echo "2. RUNNING SERVICES"
echo "--- Services ---" >> /tmp/vps_discovery.txt
systemctl list-units --type=service --all --no-pager | head -20 >> /tmp/vps_discovery.txt

echo "3. KEY PROCESSES"
echo "--- Key Processes ---" >> /tmp/vps_discovery.txt
ps aux | grep -E "node|npm|tsx|python|docker|redis|postgres" | grep -v grep >> /tmp/vps_discovery.txt

echo "4. NETWORK PORTS"
echo "--- Listening Ports ---" >> /tmp/vps_discovery.txt
ss -tlnp 2>/dev/null >> /tmp/vps_discovery.txt

echo "5. DOCKER STATUS"
echo "--- Docker ---" >> /tmp/vps_discovery.txt
{
  docker --version 2>/dev/null || echo "Docker: Not installed"
  docker ps 2>/dev/null || echo "Docker: Not running"
} >> /tmp/vps_discovery.txt

echo "6. NODE/NPM"
echo "--- Node/NPM ---" >> /tmp/vps_discovery.txt
{
  node --version 2>/dev/null || echo "Node: Not installed"
  npm list -g --depth=0 2>/dev/null | head -10 || echo "NPM: Not available"
  pm2 list 2>/dev/null || echo "PM2: Not installed"
} >> /tmp/vps_discovery.txt

echo "7. ENVIRONMENT VARIABLES"
echo "--- Key Environment Vars ---" >> /tmp/vps_discovery.txt
env | grep -E "MCP|DUFFEL|AMADEUS|GNOSIS|HFSP|CLAWDROP|API|TOKEN|KEY|SECRET" | sort >> /tmp/vps_discovery.txt

echo "8. CRON JOBS"
echo "--- Cron Jobs ---" >> /tmp/vps_discovery.txt
{
  echo "User crontabs:"
  crontab -l 2>/dev/null || echo "No user cron"
  echo "System cron:"
  ls -la /etc/cron.d/ 2>/dev/null || echo "No system cron"
} >> /tmp/vps_discovery.txt

echo "9. DIRECTORIES"
echo "--- Notable Directories ---" >> /tmp/vps_discovery.txt
{
  echo "Home directories:"
  ls -la /home/ 2>/dev/null || echo "No /home"
  echo "Service directories:"
  ls -la /srv/ 2>/dev/null || echo "No /srv"
  echo "Clawdrop/HFSP:"
  find /home -name "*clawdrop*" -o -name "*hfsp*" -o -name "*openclaw*" 2>/dev/null | head -10 || echo "None found"
} >> /tmp/vps_discovery.txt

echo "10. RECENT LOGS"
echo "--- Recent Logs ---" >> /tmp/vps_discovery.txt
{
  echo "Systemd journal (last 20):"
  journalctl -n 20 --no-pager 2>/dev/null || echo "Journal not available"
} >> /tmp/vps_discovery.txt

echo "REPORT SAVED TO /tmp/vps_discovery.txt"
cat /tmp/vps_discovery.txt
