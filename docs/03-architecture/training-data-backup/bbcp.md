---
sidbar_position: 4
---

# bbcp (TCP高速方案)

bbcp (BitTorrent-like Copy Protocol) 是一个基于 TCP 的点对点文件传输工具。它通过多流并发（Multiple Streams）和巨大的 TCP 窗口优化，能够实现接近 UDP 的传输速度，同时保持 TCP 的可靠性和防火墙友好性。

对于**WFH (居家办公)** 或 **混合网络环境**，bbcp 是最推荐的通用方案。

## 为什么适合 WFH？

| 特性 | 说明 |
|------|------|
| **推送模式** | 客户端主动连接服务器，天然穿透 NAT |
| **TCP协议** | 使用标准 TCP，防火墙友好 |
| **超高速度** | 9~11 GB/s（10Gbps局域网），接近 UDP |
| **无加密选项** | 可禁用 SSH 加密，进一步提升速度 |

## 安装

```bash
# Ubuntu/Debian
sudo apt install bbcp

# 或源码编译
git clone https://github.com/ltp/bbcp.git
cd bbcp
make
sudo make install
```

## 使用指南

### 基础用法

```bash
# 客户端（员工电脑）主动推送到文件服务器
# -a: 保留属性
# -f: 强制覆盖
# -w: TCP窗口大小 (关键性能参数)
# -S: SSH命令 (禁用加密以提速)
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/dataset.tar.gz \
    backup@file-server.company.com:/backup/${USER}/
```

### WFH 推送脚本

这是一个专为 WFH 场景设计的推送脚本，自动处理参数配置。

```bash
#!/bin/bash
# ~/scripts/backup-bbcp-wfh.sh
# WFH场景：bbcp推送模式（客户端主动上传）

set -euo pipefail

# 配置
NAS_HOST="${NAS_HOST:-backup.company.com}"
NAS_USER="${NAS_USER:-backup}"
NAS_PATH="/backup/${USER}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
    "/data/experiments"
)
TCP_WINDOW="256M"
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [bbcp] $*" | tee -a "${LOG_DIR}/bbcp_wfh_$(date +%Y%m%d).log"
}

run_backup() {
    local src="$1"
    local dst="${NAS_USER}@${NAS_HOST}:${NAS_PATH}$(dirname ${src})"
    
    if [ ! -d "${src}" ]; then
        log "跳过: ${src} 不存在"
        return 0
    fi
    
    log "推送: ${src} -> ${dst}"
    log "  TCP窗口: ${TCP_WINDOW}"
    
    # bbcp推送模式（无加密，极速）
    bbcp -a -f -w "${TCP_WINDOW}" \
        -S "ssh -c none -x -o Compression=no -o BatchMode=yes -o StrictHostKeyChecking=no" \
        --ignore-permissions \
        "${src}/" \
        "${dst}/" \
        2>&1 | while read line; do
            log "  $line"
        done
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "完成: ${src}"
        find "${src}" -type f -delete 2>/dev/null || true
    else
        log "错误: ${src}"
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== bbcp WFH推送开始 =========="
    log "目标: ${NAS_USER}@${NAS_HOST}:${NAS_PATH}"
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== bbcp WFH推送完成 =========="
}

main "$@"
```

## mbuffer 备选方案

如果无法安装 bbcp，可以使用 `tar + mbuffer + ssh` 组合。mbuffer 负责缓冲，避免 IO 瓶颈。

```bash
# 基础传输（带缓冲）
tar -cf - /data/training/ | mbuffer -s 128k -m 1G | ssh -c arcfour128 user@server "tar -xf -"
```

这种方案速度（8~10 GB/s）略低于 bbcp，但工具通用性更强。

```