#!/usr/bin/env bash
# 空山 · D1 月度导出归档（docs/ARCHITECTURE.md §7 的备份纪律）
# 用法：./scripts/backup.sh
# 产物：仓库根目录 backup-YYYY-MM-DD.sql（已被 .gitignore 排除，勿提交）
set -euo pipefail

OUT="backup-$(date +%F).sql"
npx wrangler d1 export kongshan-db-prod --remote --output="$OUT"
echo "已导出：$OUT"
echo "提醒：导出含匿名内容与身份码哈希，请转移到站外私有存储，勿公开分享。"
