---
sidebar_position: 3
---

# Tsunami UDP (极速方案)

Tsunami UDP Protocol 是一个开源的 UDP 文件传输工具，专为大文件高速传输设计。在网络质量较好（丢包率低）的局域网环境中，它可以轻松跑满物理带宽。

## 为什么选择 Tsunami UDP？

| 特性 | TCP | UDP (Tsunami) |
|------|-----|-----|
| **拥塞控制** | 保守降速 | 无，激进发送 |
| **重传机制** | 等待超时 | 应用层控制 |
| **头部开销** | 20~60字节 | 8字节 |
| **带宽利用** | 受限于窗口 | 尽可能占满 |

**结论**：在零丢包的局域网环境中，UDP可以达到**理论线速**（接近100%带宽利用率）。AWS 官方也推荐在特定的大规模数据库迁移场景中使用 Tsunami UDP。

## 安装与部署

### 安装

```bash
# 下载编译
cd /tmp
wget https://github.com/kthe/tsunami-udp/archive/refs/heads/master.zip
unzip master.zip
cd tsunami-udp-master
make -j$(nproc)

# 安装到系统
sudo cp tsunami /usr/local/bin/
sudo chmod +x /usr/local/bin/tsunami
sudo mkdir -p /etc/tsunami
```

### 基本用法

**接收端（先启动）**：
```bash
tsunami
tsunami> set peer 0.0.0.0
tsunami> set port 46200
tsunami> receive /backup/dataset.tar.gz
```

**发送端**：
```bash
tsunami
tsunami> set peer 192.168.1.100  # 接收端IP
tsunami> set port 46200
tsunami> send /data/training/dataset.tar.gz
```

## 完整备份脚本

```bash
#!/bin/bash
# ~/scripts/backup-tsunami.sh
# Tsunami UDP 极速备份（局域网专用）

set -euo pipefail

NAS_IP="192.168.1.100"
NAS_PATH="/backup/${USER}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
    "/data/experiments"
)
PORT=46200
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_DIR}/tsunami_$(date +%Y%m%d).log"
}

run_backup() {
    local src="$1"
    local dst="${NAS_IP}:${NAS_PATH}$(dirname ${src})"
    
    log "备份: ${src} -> ${dst}"
    
    # Tsunami UDP 传输
    # 注意：需要在接收端先启动 tsunami receive
    tsunami <<EOF
set port ${PORT}
set peer ${NAS_IP}
send ${src}/*
quit
EOF
    
    if [ $? -eq 0 ]; then
        log "完成: ${src}"
        log "删除源文件: ${src}"
        find "${src}" -type f -delete 2>/dev/null || true
    else
        log "错误: ${src}"
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== Tsunami UDP 极速备份开始 =========="
    
    for path in "${SOURCE_PATHS[@]}"; do
        if [ -d "${path}" ]; then
            run_backup "${path}"
        fi
    done
    
    log "========== Tsunami UDP 备份完成 =========="
}

main "$@"
```

## 接收端常驻服务 (Systemd)

为了让 Tsunami 能够随时接收文件，建议在文件服务器上配置 Systemd 服务。

```ini
# /etc/systemd/system/tsunami-receive.service
[Unit]
Description=Tsunami UDP 接收服务
After=network-online.target

[Service]
Type=simple
User=backup
ExecStart=/usr/local/bin/tsunami receive /backup/%u
StandardOutput=journal
StandardError=journal
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
