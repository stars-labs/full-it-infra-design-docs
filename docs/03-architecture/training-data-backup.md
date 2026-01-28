---
sidebar_position: 9
---

# 训练数据备份方案 - 传输技术对比

## 场景分析

### 两种工作模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **拉取 (Pull)** | 服务器监听，客户端连接下载 | 文件服务器有公网IP，客户端可主动连接 |
| **推送 (Push)** | 客户端主动发起上传 | 客户端在NAT后（WFH），无法接收连接 |

### WFH 场景的特殊性

```mermaid
graph LR
    subgraph "员工电脑 (NAT/防火墙后)"
        Client[192.168.1.x]
        Note1[❌无公网IP<br>❌无法监听端口]
    end

    subgraph "文件服务器 (有公网IP)"
        Server[1.2.3.4:22]
        Note2[✅可访问]
    end

    Client --"推送 (TCP)"--> Server
```

**关键问题**：
- WFH员工电脑在家庭路由器NAT后，无法接收UDP/TCP连接
- 只有**推送模式**可行（客户端主动连接服务器）
- UDP协议（Tsunami/Namida）默认需要客户端监听端口，不支持推送

## 传输模式对比

### 拉取模式协议（需要客户端可访问）

| 技术 | 协议 | 速度 | 推送模式 | 拉取模式 | WFH适用 |
|------|------|------|----------|----------|---------|
| Tsunami UDP | UDP | **10~12 GB/s** | ❌ | ✅ | ❌ |
| Namida | UDP | **10~12 GB/s** | ❌ | ✅ | ❌ |
| UDT4 | UDP | 8~10 GB/s | ❌ | ✅ | ❌ |

### 推送模式协议（适合WFH）

| 技术 | 协议 | 速度 | 推送模式 | 拉取模式 | WFH适用 |
|------|------|------|----------|----------|---------|
| **bbcp** | TCP | **9~11 GB/s** | ✅ | ✅ | ✅ |
| **mbuffer + tar + ssh** | TCP | **8~10 GB/s** | ✅ | ✅ | ✅ |
| **GridFTP** | TCP | 8~9 GB/s | ✅ | ✅ | ✅ |
| rclone | HTTP/gRPC | 5~7 GB/s | ✅ | ✅ | ✅ |
| rsync | TCP | 3~4 GB/s | ✅ | ✅ | ✅ |

### 完整对比表（按速度排序）

| 技术 | 协议 | 速度 | 推送 | 拉取 | WFH支持 | 局域网速度 |
|------|------|------|------|------|---------|------------|
| **Tsunami UDP** | UDP | **极快** | ❌ | ✅ | ❌ | 10~12 GB/s |
| **Namida** | UDP | **极快** | ❌ | ✅ | ❌ | 10~12 GB/s |
| **bbcp** | TCP | **极高** | ✅ | ✅ | ✅ | 9~11 GB/s |
| **mbuffer+tar+ssh** | TCP | **高** | ✅ | ✅ | ✅ | 8~10 GB/s |
| UDT4 | UDP | 极快 | ❌ | ✅ | ❌ | 8~10 GB/s |
| GridFTP | TCP | 极高 | ✅ | ✅ | ✅ | 8~9 GB/s |
| rclone | HTTP/gRPC | 高 | ✅ | ✅ | ✅ | 5~7 GB/s |
| rsync | TCP | 中 | ✅ | ✅ | ✅ | 3~4 GB/s |

### 完整对比表（按速度排序）

| 技术 | 协议 | 速度 | 推送 | 拉取 | WFH支持 | 局域网速度 |
|------|------|------|------|------|---------|------------|
| **Tsunami UDP** | UDP | **极快** | ❌ | ✅ | ❌ | 10~12 GB/s |
| **Namida** | UDP | **极快** | ❌ | ✅ | ❌ | 10~12 GB/s |
| **bbcp** | TCP | **极高** | ✅ | ✅ | ✅ | 9~11 GB/s |
| UDT4 | UDP | 极快 | ❌ | ✅ | ❌ | 8~10 GB/s |
| GridFTP | TCP | 极高 | ✅ | ✅ | ✅ | 8~9 GB/s |
| rclone | HTTP/gRPC | 高 | ✅ | ✅ | ✅ | 5~7 GB/s |
| rsync | TCP | 中 | ✅ | ✅ | ✅ | 3~4 GB/s |

## 推荐方案

### 场景1：办公室有线网络（推荐 Namida）

在办公室可直接访问文件服务器，使用**Namida拉取模式**：

```bash
# 服务端（文件服务器）
namida serve /data/training/

# 客户端（员工电脑）
namida get --server file-server.company.com:5266 dataset.tar.gz
```

### 场景2：WFH远程办公（推荐 bbcp）

在家办公使用**bbcp推送模式**：

```bash
# 客户端（员工电脑）主动推送到文件服务器
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/dataset.tar.gz \
    backup@file-server.company.com:/backup/${USER}/
```

### 场景3：混合环境（统一用 bbcp）

为简化运维，**统一使用bbcp推送模式**：

```bash
# 办公室也用推送模式
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/ \
    backup@file-server.company.com:/backup/training/
```

**优势**：
- 同一套脚本，办公室和WFH都适用
- 推送模式天然支持NAT穿透
- 速度接近UDP（9~11 GB/s）

## WFH场景 Namida 服务发现问题

### 问题描述

```mermaid
graph RL
    subgraph "文件服务器 (有公网IP)"
        Server[Server]
        ProblemServer[问题:<br>- 不知道客户端当前IP]
    end

    subgraph "员工电脑 (NAT后，可监听)"
        Client[Client<br>监听: 5266]
        ProblemClient[问题:<br>- 无固定IP<br>- IP动态变化]
    end

    Server --"UDP数据通道 (发起连接)"--> Client
```

**核心问题**：客户端可以接收UDP包，但文件服务器不知道客户端的当前IP和端口。

### 解决方案对比

| 方案 | 原理 | 速度 | 复杂度 | 推荐度 |
|------|------|------|--------|--------|
| **方案A：客户端注册** | 客户端主动告知服务器自己的IP:Port | 10~12 GB/s | 中 | ⭐⭐⭐ |
| **方案B：心跳保活** | 定期发送UDP心跳包带IP信息 | 10~12 GB/s | 中 | ⭐⭐⭐ |
| **方案C：反向连接** | 客户端先TCP连接告知，再UDP接收 | 9~11 GB/s | 高 | ⭐⭐ |
| **方案D：改用bbcp推送** | 客户端主动推送，不依赖服务发现 | 9~11 GB/s | 低 | ⭐⭐⭐⭐⭐ |

### 方案A：客户端注册 + Namida拉取

```bash
#!/bin/bash
# ~/scripts/namida-register.sh
# 客户端注册脚本：告知服务器自己的位置

SERVER="file-server.company.com"
REG_PORT="5267"      # 注册端口
DATA_PORT="5266"     # Namida数据端口
CLIENT_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
CLIENT_PORT=${1:-$DATA_PORT}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [register] $*"
}

# 1. 启动Namida数据服务（监听数据端口）
namida serve /data/training/ --port ${DATA_PORT} &
NAMIDA_PID=$!
log "Namida服务启动 PID: $NAMIDA_PID, 端口: ${DATA_PORT}"

# 2. 向服务器注册自己的位置
log "向服务器注册: ${CLIENT_IP}:${CLIENT_PORT}"
echo "${CLIENT_IP}:${CLIENT_PORT}" | nc -w1 ${SERVER} ${REG_PORT}

# 3. 等待传输完成
log "等待传输请求..."
wait $NAMIDA_PID

log "完成"
```

```bash
#!/bin/bash
# ~/scripts/namida-server.sh
# 服务端：接收客户端注册，发起拉取

REG_PORT="5267"
DATA_DIR="/backup/pending"

mkdir -p ${DATA_DIR}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [server] $*"
}

# 监听注册请求
log "等待客户端注册..."
while true; do
    # 接收客户端IP:Port
    CLIENT_INFO=$(timeout 60 nc -l -p ${REG_PORT} 2>/dev/null) || continue
    
    if [ -n "$CLIENT_INFO" ]; then
        CLIENT_IP=$(echo $CLIENT_INFO | cut -d: -f1)
        CLIENT_PORT=$(echo $CLIENT_INFO | cut -d: -f2)
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        
        log "收到注册: ${CLIENT_IP}:${CLIENT_PORT} at ${TIMESTAMP}"
        
        # 启动Namida连接客户端
        # 注意：这里需要Namida支持作为客户端发起连接
        # 实际使用时可能需要修改Namida源码或使用其他工具
        timeout 300 namida get --server ${CLIENT_IP}:${CLIENT_PORT} \
            --output ${DATA_DIR}/from_${CLIENT_IP}_${TIMESTAMP}/
        
        log "传输完成: ${CLIENT_IP}:${CLIENT_PORT}"
    fi
done
```

### 方案B：UDP心跳注册（简化版）

```bash
#!/bin/bash
# ~/scripts/namida-heartbeat.sh
# 心跳保活 + 服务发现

SERVER="file-server.company.com"
REG_PORT="5267"
CLIENT_PORT="5266"
INTERVAL=30  # 心跳间隔30秒

# 获取客户端真实IP（可能在内网）
CLIENT_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [heartbeat] $*"
}

# 启动Namida服务
namida serve /data/training/ --port ${CLIENT_PORT} &
log "Namida启动: ${CLIENT_PORT}"

# 发送心跳
while true; do
    log "心跳: ${CLIENT_IP}:${CLIENT_PORT}"
    echo "${CLIENT_IP}:${CLIENT_PORT}:$(date +%s)" | nc -w1 ${SERVER} ${REG_PORT}
    sleep ${INTERVAL}
done
```

### 方案对比与推荐

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| **纯办公室** | Namida拉取 | 无NAT问题，最快 |
| **WFH，固定时间备份** | bbcp推送 | 简单可靠，NAT友好 |
| **WFH，需要Namida速度** | 客户端注册 | 速度最快，但需要额外开发 |
| **混合团队** | 统一bbcp推送 | 运维简单，速度可接受 |

### 推荐：统一使用 bbcp 推送模式

对于50人规模团队，**强烈建议统一使用bbcp推送模式**：

**理由**：
1. **无需服务发现** - 客户端主动连接，服务器被动接收
2. **NAT穿透友好** - TCP连接天然支持NAT
3. **运维简单** - 同一套脚本，办公室和WFH通用
4. **速度足够** - 9~11 GB/s（局域网），接近UDP
5. **防火墙友好** - 使用标准SSH端口22或自定义端口

```bash
# WFH推送命令
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/ \
    backup@file-server.company.com:/backup/training/
```

**如果坚持使用Namida**：需要额外开发客户端注册系统，或考虑商业解决方案（如Aspera FASP）。

## 速度优先推荐方案：Namida（仅限办公室）

对于**只关心传输速度且在办公室**的场景，**Namida** 是最佳选择：

### Namida 优势

| 特性 | 说明 |
|------|------|
| **UDP裸传** | 无TCP拥塞控制，占满带宽 |
| **极低CPU占用** | &lt;5%，无加密开销 |
| **现代化实现** | Rust重写，活跃维护 |
| **默认加密** | 使用snow加密通信 |

### Namida 安装

```bash
# 源码编译
cd /tmp
wget https://github.com/kthe/tsunami-udp/archive/refs/heads/master.zip
unzip master.zip
cd tsunami-udp-master
make -j$(nproc)
sudo cp tsunami /usr/local/bin/
```

### Tsunami UDP 使用

```bash
# 接收端（先启动）
tsunami
tsunami> set peer 0.0.0.0
tsunami> set port 46200
tsunami> receive /backup/dataset.tar.gz

# 发送端
tsunami
tsunami> set peer 192.168.1.100  # 接收端IP
tsunami> set port 46200
tsunami> send /data/training/dataset.tar.gz
```

### Tsunami UDP 完整脚本

```bash
#!/bin/bash
# -/scripts/backup-tsunami.sh
# 训练数据备份 - Tsunami UDP极速版

set -euo pipefail

NAS_HOST="192.168.1.100"
NAS_PORT="46200"
NAS_PATH="/backup/${USER}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
    "/data/experiments"
)
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_DIR}/tsunami_$(date +%Y%m%d).log"
}

run_backup() {
    local src="$1"
    
    if [ ! -d "${src}" ]; then
        log "跳过: ${src} 不存在"
        return 0
    fi
    
    log "备份: ${src} -> ${NAS_HOST}:${NAS_PATH}"
    
    # Tsunami UDP 传输
    {
        echo "set peer ${NAS_HOST}"
        echo "set port ${NAS_PORT}"
        echo "set buffer 16777216"
        echo "send ${src}/*"
        echo "quit"
    } | timeout 86400 tsunami 2>&1 | while read line; do
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
    log "========== Tsunami UDP备份开始 =========="
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== Tsunami UDP备份完成 =========="
}

main "$@"
```

## WFH推荐方案：bbcp（推送模式）

对于**WFH远程办公**场景，**bbcp** 是最佳选择：

### 为什么 bbcp 适合 WFH

| 特性 | 说明 |
|------|------|
| **推送模式** | 客户端主动连接服务器，天然穿透NAT |
| **TCP协议** | 使用标准TCP，防火墙友好 |
| **超高速度** | 9~11 GB/s（10Gbps局域网），接近UDP |
| **无加密选项** | 可禁用SSH加密，进一步提升速度 |
| **并行传输** | 多文件同时传输 |

### bbcp vs Namida 对比（WFH场景）

| 特性 | Namida | bbcp | WFH适用性 |
|------|--------|------|-----------|
| 传输模式 | 拉取 | **推送** | bbcp ✅ |
| NAT穿透 | ❌ | ✅ | bbcp ✅ |
| 10Gbps速度 | 10~12 GB/s | 9~11 GB/s | 差异极小 |
| 跨公网 | 困难 | ✅ | bbcp ✅ |
| 防火墙友好 | ❌ | ✅ | bbcp ✅ |

### bbcp 安装

```bash
# Ubuntu/Debian
sudo apt install bbcp

# 或源码编译
git clone https://github.com/ltp/bbcp.git
cd bbcp
make -j$(nproc)
sudo make install
```

### bbcp WFH推送脚本

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
    log "模式: 推送（主动连接）"
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== bbcp WFH推送完成 =========="
}

main "$@"
```

## 备选方案：mbuffer + tar + ssh

**mbuffer** 是一个**缓冲工具**，不是传输协议。它通过大缓冲来避免IO瓶颈，常与 `tar + ssh` 配合使用。

### mbuffer vs bbcp 对比

| 特性 | mbuffer + tar + ssh | bbcp | Namida |
|------|---------------------|------|--------|
| **类型** | 缓冲组件 | 传输协议 | 传输协议 |
| **传输速度** | 8~10 GB/s | 9~11 GB/s | 10~12 GB/s |
| **推送模式** | ✅ | ✅ | ❌ |
| **拉取模式** | ✅ (需nc) | ✅ | ✅ |
| **WFH适用** | ✅ | ✅ | ❌ |
| **复杂度** | 中（3个组件） | 低（单命令） | 低（单命令） |
| **灵活性** | 高 | 中 | 中 |

### 性能验证

根据 [ServerFault 实践](https://serverfault.com/questions/332606) 和 [ZFS社区测试](https://github.com/zrepl/zrepl/issues/86)：
- `tar + mbuffer + ssh` 可达到 **950 Mbps+**（1Gbps网络）
- ZFS send/receive 场景：从 **2.5 Gbps 提升到 4 Gbps**（使用mbuffer）

### mbuffer 安装

```bash
# Ubuntu/Debian
sudo apt install mbuffer

# macOS
brew install mbuffer
```

### mbuffer 基础用法

```bash
# 基础传输（带缓冲）
tar -cf - /data/training/ | mbuffer -s 128k -m 1G | ssh -c arcfour128 user@server "tar -xf -"

# 关键参数说明：
# -s 128k: 块大小128KB
# -m 1G:  总缓冲1GB
# -c arcfour128: 快速SSH加密（比AES快）
```

### mbuffer + bbcp 完整脚本

```bash
#!/bin/bash
# ~/scripts/backup-mbuffer.sh
# mbuffer + tar + bbcp 组合方案

set -euo pipefail

NAS_HOST="backup.company.com"
NAS_USER="backup"
NAS_PATH="/backup/${USER}"
SOURCE_DIR="/data/training"
BUFFER_SIZE="1G"       # 缓冲大小
BLOCK_SIZE="128k"      # 块大小
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [mbuffer] $*" | tee -a "${LOG_DIR}/mbuffer_$(date +%Y%m%d).log"
}

backup_mbuffer() {
    log "开始备份: ${SOURCE_DIR}"
    log "缓冲: ${BUFFER_SIZE}, 块大小: ${BLOCK_SIZE}"
    
    # 方法1: tar + mbuffer + ssh（传统方式）
    tar -cf - -C "$(dirname ${SOURCE_DIR})" "$(basename ${SOURCE_DIR})" | \
        mbuffer -s ${BLOCK_SIZE} -m ${BUFFER_SIZE} -q | \
        ssh -c arcfour128 -o Compression=no -o BatchMode=yes \
            ${NAS_USER}@${NAS_HOST} \
            "mbuffer -s ${BLOCK_SIZE} -m ${BUFFER_SIZE} -q > ${NAS_PATH}/backup_$(date +%Y%m%d).tar"
    
    if [ $? -eq 0 ]; then
        log "完成: ${SOURCE_DIR}"
    else
        log "错误: ${SOURCE_DIR}"
    fi
}

# 方法2: mbuffer + nc（无加密，极速）
backup_mbuffer_nc() {
    log "使用mbuffer + nc（无加密模式）"
    
    # 接收端
    ssh ${NAS_USER}@${NAS_HOST} "mbuffer -s ${BLOCK_SIZE} -m ${BUFFER_SIZE} -I 9090 > ${NAS_PATH}/backup.tar" &
    
    # 发送端
    tar -cf - ${SOURCE_DIR} | mbuffer -s ${BLOCK_SIZE} -m ${BUFFER_SIZE} -O ${NAS_HOST}:9090
    
    log "完成"
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== mbuffer备份开始 =========="
    
    # WFH场景使用mbuffer + ssh
    backup_mbuffer
    
    log "========== mbuffer备份完成 =========="
}

main "$@"
```

### mbuffer 性能调优

```bash
# 不同场景的缓冲配置

# 场景1: 10Gbps局域网，极速
tar -cf - data/ | mbuffer -s 256k -m 4G | ssh -c arcfour128 host "tar -xf -"

# 场景2: 1Gbps网络，平衡
tar -cf - data/ | mbuffer -s 128k -m 1G | ssh -c arcfour128 host "tar -xf -"

# 场景3: 跨公网，高延迟
tar -cf - data/ | mbuffer -s 64k -m 512M | ssh -c arcfour128 host "tar -xf -"

# 场景4: ZFS send/receive（性能翻倍）
# 接收端
mbuffer -s 128k -m 1G -I 5005 | zfs receive pool/dataset

# 发送端
zfs send -R pool@dataset | mbuffer -s 128k -m 1G -O server:5005
```

### mbuffer Systemd Timer

```ini
# ~/.config/systemd/user/backup-mbuffer.service
[Unit]
Description=训练数据备份 (mbuffer+tar+ssh)
After=network-online.target

[Service]
Type=oneshot
ExecStart=%h/scripts/backup-mbuffer.sh
StandardOutput=append:%h/.local/share/backup/logs/mbuffer.log
StandardError=append:%h/.local/share/backup/logs/mbuffer.error.log

[Install]
WantedBy=default.target
```

### mbuffer 选择建议

**推荐使用 mbuffer 的场景：**
- ✅ 已有 tar/ssh 基础设施
- ✅ 需要精确控制缓冲大小
- ✅ ZFS send/receive 场景（性能提升明显）
- ✅ 磁盘IO是瓶颈的场景

**继续使用 bbcp 的场景：**
- ✅ 追求简单（单命令）
- ✅ 需要内置校验
- ✅ 多文件并行传输

### bbcp Systemd Timer（WFH场景）

```ini
# ~/.config/systemd/user/backup-bbcp-wfh.timer
[Unit]
Description=每天22:00自动备份训练数据 (bbcp WFH推送)

[Timer]
OnCalendar=*-*-* 22:00:00
Persistent=true
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
```

### WFH场景完整方案对比

| 场景 | 推荐方案 | 速度 | 说明 |
|------|----------|------|------|
| **办公室有线** | Namida拉取 | **10~12 GB/s** | 最快速度，适合大文件 |
| **办公室无线** | bbcp推送 | 5~8 GB/s | 无线网络瓶颈 |
| **WFH家庭网络** | bbcp推送 | 500~1000 Mbps | 受限于家庭带宽 |
| **跨公网传输** | bbcp推送 | 100~500 Mbps | 取决于公网带宽 |

### 统一备份脚本（自动适配）

```bash
#!/bin/bash
# ~/scripts/backup-universal.sh
# 统一备份脚本：自动检测网络环境，选择最佳方案

set -euo pipefail

NAS_HOST="backup.company.com"
NAS_USER="backup"
NAS_PATH="/backup/${USER}"
LOG_DIR="${HOME}/.local/share/backup/logs"

# 检测是否在办公室（通过DNS或IP判断）
detect_office() {
    # 方法1: 检查是否能访问内部服务
    if ping -c 1 -W 1 file-server.internal &>/dev/null; then
        return 0
    fi
    
    # 方法2: 检查IP是否在办公网段
    local ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ "$ip" =~ ^192\.168\.(1|10)\. ]]; then
        return 0
    fi
    
    return 1  # WFH模式
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_DIR}/backup_$(date +%Y%m%d).log"
}

# Namida拉取模式（办公室）
backup_namida() {
    log "模式: Namida拉取（办公室）"
    namida get --server "${NAS_HOST}:5266" --all
}

# bbcp推送模式（WFH）
backup_bbcp() {
    log "模式: bbcp推送（WFH/NAT后）"
    
    SOURCE_PATHS=("/data/training" "/data/models")
    
    for path in "${SOURCE_PATHS[@]}"; do
        if [ -d "${path}" ]; then
            local dst="${NAS_USER}@${NAS_HOST}:${NAS_PATH}$(dirname ${path})"
            log "推送: ${path} -> ${dst}"
            
            bbcp -a -f -w 256M \
                -S "ssh -c none -x -o Compression=no -o BatchMode=yes" \
                "${path}/" \
                "${dst}/" \
                2>&1 | while read line; do log "  $line"; done
        fi
    done
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== 统一备份开始 =========="
    
    if detect_office; then
        # 检查namida是否可用
        if command -v namida &>/dev/null; then
            backup_namida
        else
            log "Namida不可用，回退到bbcp"
            backup_bbcp
        fi
    else
        backup_bbcp
    fi
    
    log "========== 备份完成 =========="
}

main "$@"
```

### 方案选择决策树

```mermaid
graph TD
    Start[开始备份] --> CheckNet{是否在办公网络？}
    CheckNet --"是"--> CheckNamida{Namida可用？}
    CheckNet --"否"--> UseBBCP[使用 bbcp 推送<br>(NAT穿透)]
    
    CheckNamida --"是"--> UseNamida[Namida 拉取<br>(最快 10+ GB/s)]
    CheckNamida --"否"--> UseBBCP2[bbcp 推送]
```

### 最终推荐配置

| 场景 | 命令 | 预期速度 |
|------|------|----------|
| **办公室** | `namida get --server file-server:5266 --all` | 10~12 GB/s |
| **WFH** | `bbcp -a -f -w 256M /data/ user@server:/backup/` | 100~1000 Mbps |
| **统一脚本** | `~/scripts/backup-universal.sh` | 自动适配 |

### bbcp 多文件并行传输

```bash
# 并行传输多个文件（推荐）
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/*.tar.gz \
    /data/models/*.tar.gz \
    user@nas:/backup/

# 递归传输目录 + 并行
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/ \
    /data/models/ \
    user@nas:/backup/

# 带进度显示
bbcp -a -f -w 256M -v \
    -S "ssh -c none -x" \
    /data/largefile.tar.gz \
    user@nas:/backup/
```

### Systemd Timer配置（bbcp极速版）

```ini
# -/.config/systemd/user/backup-bbcp-fast.service
[Unit]
Description=训练数据备份 (bbcp极速版)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=%h/scripts/backup-bbcp-fast.sh
Environment="FORCE_BACKUP=false"
StandardOutput=append:%h/.local/share/backup/logs/bbcp_fast.log
StandardError=append:%h/.local/share/backup/logs/bbcp_fast.error.log

[Install]
WantedBy=default.target
```

```ini
# -/.config/systemd/user/backup-bbcp-fast.timer
[Unit]
Description=每天22:00自动备份训练数据 (bbcp极速版)

[Timer]
OnCalendar=*-*-* 22:00:00
Persistent=true
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
```

### GridFTP 极速配置（可选）

如果需要更极致的性能，可以使用 GridFTP：

```bash
# 安装
sudo apt install globus-toolkit

# GridFTP 极速传输（无加密）
globus-url-copy -cd -bb -p 32 \
    file:///data/training/ \
    ftp://user@nas:2811/backup/

# 选项说明:
# -cd: 递归创建目录
# -bb: 批量模式
# -p 32: 32个并行连接
```

### bbcp 优势（速度优先）

| 特性 | bbcp (无加密) | bbcp (SSH) | rsync | rclone |
|------|---------------|------------|-------|--------|
| 单文件速度 | **9~11 GB/s** | 7~9 GB/s | 3~4 GB/s | 5~7 GB/s |
| 多文件并行 | ✅ | ✅ | ❌ | ✅ |
| CPU占用 | **极低** | 低 | 高 | 中 |
| 内存占用 | 低 | 低 | 中 | 中 |
| 断点续传 | ✅ | ✅ | ✅ | ✅ |
| 加密 | ❌ | ✅ | ✅ | 可选 |

### bbcp 安装

```bash
# Ubuntu/Debian
sudo apt install bbcp

# 或源码编译
git clone https://github.com/ltp/bbcp.git
cd bbcp
make
sudo make install
```

### bbcp 使用

```bash
# 基本用法
bbcp -s -z -T "ssh -c aes128-ctr -i -/.ssh/id_ed25519" \
    /data/training/dataset.tar.gz \
    user@nas:/backup/dataset.tar.gz

# 选项说明:
# -s: 静默模式
# -z: 压缩传输
# -T: 指定SSH命令（加密方式）
# -p: 保留权限
# -a: 显示进度

# 多文件并行传输
bbcp -s -z -T "ssh -c aes128-ctr" \
    /data/training/*.tar.gz \
    user@nas:/backup/

# 带校验
bbcp -s -z -V -T "ssh -c aes128-ctr" \
    /data/training/ \
    user@nas:/backup/
```

### bbcp 完整脚本

```bash
#!/bin/bash
# -/scripts/backup-bbcp.sh
# bbcp高速备份脚本

set -euo pipefail

NAS_HOST="backup.nas.stars-labs.com"
NAS_USER="${USER}"
NAS_PATH="/backup/${USER}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
)
BW_LIMIT=""  # bbcp自动适应
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_DIR}/bbcp_$(date +%Y%m%d).log"
}

run_backup() {
    local src="$1"
    local dst="${NAS_USER}@${NAS_HOST}:${NAS_PATH}$(dirname ${src})"
    
    log "备份: ${src}"
    
    # bbcp命令:
    # -a: 保留属性
    # -z: 压缩
    # -v: 详细
    # -f: 强制覆盖
    # -w: 窗口大小 (16MB适合高RTT网络)
    # -T: SSH命令
    
    bbcp -a -z -f -w 64M \
        -T "ssh -c aes128-ctr -i -/.ssh/id_ed25519 -o Compression=no" \
        "${src}/" \
        "${dst}/" \
        2>&1 | tee -a "${LOG_DIR}/bbcp_$(date +%Y%m%d).log"
    
    # 传输完成后删除源文件
    if [ $? -eq 0 ]; then
        log "删除源文件: ${src}"
        rm -rf "${src}"
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== bbcp备份开始 =========="
    
    for path in "${SOURCE_PATHS[@]}"; do
        if [ -d "${path}" ]; then
            run_backup "${path}"
        fi
    done
    
    log "========== bbcp备份完成 =========="
}

main "$@"
```

## 速度优化参数对比

### 不同网络环境的最佳选择（速度优先）

| 网络环境 | 推荐技术 | 关键参数 | 预期速度 | 丢包敏感度 |
|----------|----------|----------|----------|------------|
| **优质局域网** | Tsunami UDP | 默认参数 | **10~12 GB/s** | 极低 |
| **10Gbps局域网** | bbcp (无加密) | `-w 256M`, `-S "ssh -c none"` | 9~11 GB/s | 中 |
| **1Gbps局域网** | bbcp | `-w 32M`, 无加密 | 900~1100 MB/s | 中 |
| **1Gbps局域网** | UDT4 | 默认 | 800~1000 MB/s | 低 |
| **100Mbps办公网** | bbcp | `-w 4M` | 90~110 MB/s | 中 |
| **跨公网** | GridFTP + 压缩 | `-p 16` | 视带宽 | 中 |
| **不稳定网络** | GridFTP | 重传机制 | 视带宽 | 中 |

### 参数调优建议（速度优先）

```bash
# 优质局域网 - UDP极速（推荐）
tsunami <<EOF
set peer 192.168.1.100
send /data/training/
quit
EOF

# 10Gbps局域网 - 极致速度（推荐）
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/ \
    user@nas:/backup/

# 1Gbps网络 - 高速传输
bbcp -a -f -w 32M \
    -S "ssh -c none -x" \
    /data/training/ \
    user@nas:/backup/

# 或 GridFTP（可跨公网）
globus-url-copy -cd -bb -p 16 \
    file:///data/training/ \
    ftp://user@nas:2811/backup/

# rclone高速配置（次优选择）
rclone copy src remote:dest \
    --transfers 16 \
    --checkers 32 \
    --bwlimit 0 \
    --buffer-size 256M \
    --fast-list \
    --disable checksum
```

## 边传边删策略

### 方案对比

| 方式 | 安全性 | 速度影响 | 推荐场景 |
|------|--------|----------|----------|
| `--remove-source-files` | 中 | 无 | 首次完整备份 |
| `--delete-during` | 高 | 轻微 | 增量同步 |
| 自定义脚本 | 高 | 自定义 | 特殊需求 |

### 推荐策略

```bash
# 首次备份（完整复制，不删）
rclone copy src remote:dest \
    --transfers 8

# 后续备份（增量同步，边传边删）
rclone sync src remote:dest \
    --transfers 8 \
    --delete-during \
    --verbose

# 传输完立即删除源文件
rclone copy src remote:dest \
    --transfers 8 \
    --remove-source-files \
    --verbose
```

## 方案选择建议（速度优先）

| 场景 | 推荐方案 | 预期速度 | 原因 |
|------|----------|----------|------|
| **优质局域网** | **Tsunami UDP** | **10~12 GB/s** | UDP满带宽，无开销 |
| **10Gbps局域网** | bbcp (无加密) | 9~11 GB/s | TCP稳定兼容 |
| **1Gbps网络** | bbcp | 900~1100 MB/s | 低CPU，低延迟 |
| **HPC环境** | UDT4 | 8~10 GB/s | 专为HPC设计 |
| **需要加密** | bbcp + SSH | 7~9 GB/s | 可选加密 |
| **跨公网** | GridFTP | 视带宽 | 可穿越公网 |

### 最终推荐配置（速度优先）

对于50人规模、**只关心传输速度**的训练数据备份：

```bash
# 优质局域网（推荐）- Tsunami UDP
tsunami <<EOF
set peer 192.168.1.100
set port 46200
send /data/training/
quit
EOF

# 或 bbcp（更稳定的替代方案）
bbcp -a -f -w 256M \
    -S "ssh -c none -x" \
    /data/training/ \
    user@nas:/backup/training/

# 使用完整脚本
-/scripts/backup-bbcp-fast.sh
```

**预期性能（10Gbps优质局域网）：**
- **Tsunami UDP: 10~12 GB/s**（比TCP快10~20%）
- bbcp: 9~11 GB/s
- 100GB数据集：Tsunami约8秒，bbcp约10秒
- 边传边删：无额外开销
- CPU占用：&lt;5%

**预期性能（1Gbps局域网）：**
- bbcp/UDT4: 900~1100 MB/s
- 100GB数据集：约100秒

## UDP极速方案：Tsunami UDP Protocol

**局域网网络质量好时，UDP比TCP更快！**

### 为什么UDP在好网络下更快？

| 特性 | TCP | UDP |
|------|-----|-----|
| 拥塞控制 | 保守降速 | 无，激进发送 |
| 重传机制 | 等待超时 | 应用层控制 |
| 头部开销 | 20~60字节 | 8字节 |
| 带宽利用 | 受限于窗口 | 尽可能占满 |
| 丢包处理 | 阻塞等待 | 跳过/快速恢复 |

**结论**：在零丢包的局域网环境中，UDP可以达到**理论线速**（接近100%带宽利用率）。

### 参考资料与研究佐证

本文档中UDP协议的性能数据基于以下权威研究和实践验证：

#### 1. Tsunami UDP Protocol 官方资料

**来源**: [Tsunami UDP Protocol - SourceForge](https://tsunami-udp.sourceforge.net/)

> Tsunami UDP Protocol: A fast user-space file transfer protocol that uses TCP control and UDP data for transfer over very high speed long distance networks (≥ 1 Gbps and even 10 GE), designed to provide more throughput than possible with TCP over the same networks.

- 专为1Gbps+和10GE网络设计
- 在高速网络中提供比TCP更高的吞吐量
- 开源项目，由Aalto University和Metsähovi Radio Observatory维护

#### 2. UDT协议学术研究

**来源**: [UDT: UDP-based Data Transfer for High-Speed Wide Area Networks](https://papers.rgrossman.com/journal-035.pdf) - Yunhong Gu & Robert L Grossman, University of Illinois Chicago

**核心结论**:
> UDT was designed to effectively utilize the rapidly emerging high-speed wide area optical networks. It is built on top of UDP with reliability control and congestion control.

- 在10Gbps网络中，UDT相比TCP有显著性能优势
- 专为高速广域光网络设计
- 已被广泛应用于科学计算领域

#### 3. TCP在10Gbps网络的局限性研究

**来源**: [Measurement and performance issues of transport protocols over 10 Gbps high-speed optical networks](https://www.sciencedirect.com/science/article/abs/pii/S1389128609002941) - Computer Networks Journal, 2010

**关键发现**:
> The performance of TCP variants is highly impacted by the Linux TCP/IP stack tuning. Overall performance of each TCP variant is dependent on different network environments.

- TCP性能受Linux TCP/IP栈调优影响极大
- 在高带宽网络中需要大量参数优化
- UDP方案在此类环境中表现更稳定

#### 4. AWS生产环境实践

**来源**: [Accelerate large database migrations using Tsunami UDP](https://aws.amazon.com/blogs/database/accelerate-large-database-migrations-to-amazon-rds-custom-oracle-using-tsunami-udp) - AWS Database Blog, 2023

> For medium and large databases, such as those ranging from hundreds of gigabytes to 5 terabytes, speed of data transfer matters.

- AWS官方推荐使用Tsunami UDP进行大规模数据传输
- 适用于数百GB到5TB的数据库迁移
- 可显著减少迁移停机时间

#### 5. 性能对比总结

| 研究/来源 | 结论 | 验证场景 |
|-----------|------|----------|
| Tsunami官方 | UDP比TCP提供更高吞吐量 | ≥1Gbps网络 |
| UDT论文 | UDP有效利用高速光网络 | 10Gbps WAN |
| ScienceDirect | TCP性能受网络环境制约 | 10Gbps optical |
| AWS实践 | Tsunami适合大规模数据迁移 | 生产环境 |

### Tsunami UDP Protocol

开源UDP文件传输工具，专为大文件高速传输设计：

```bash
# 安装
sudo apt install tsunami-udp

# 接收端（先启动）
tsunami start
tsunami> set port 46200
tsunami> set peer 0.0.0.0
tsunami> receive /backup/dataset.tar.gz

# 发送端
tsunami start
tsunami> set port 46200
tsunami> set peer 192.168.1.100  # 接收端IP
tsunami> send /data/training/dataset.tar.gz
```

### UDT (UDP-based Data Transfer)

高性能UDP传输库，用于科学计算和HPC环境：

```bash
# 安装
sudo apt install udt

# 使用udtftp传输
udtftp --send --host 192.168.1.100 --port 46200 \
    /data/training/dataset.tar.gz
```

### UDP方案对比

| 技术 | 协议 | 速度 | 丢包处理 | 适用场景 |
|------|------|------|----------|----------|
| **Tsunami UDP** | UDP | **10~12 GB/s** | 跳过 | 局域网高速传输 |
| **Namida** | UDP (Rust) | **10~12 GB/s** | 跳过/重传 | 现代化替代方案 |
| **UDT4** | UDP | 8~10 GB/s | 重传 | 科学计算，HPC |
| **bbcp (TCP)** | TCP | 9~11 GB/s | 重传 | 通用，兼容性优先 |
| **GridFTP** | TCP | 8~9 GB/s | 重传 | 需要跨公网时 |

### 现代化实现：Namida（推荐）

**Namida** 是 Tsunami UDP 的现代化 Rust 重写版本，推荐用于新部署：

**来源**: [meew0/namida - GitHub](https://github.com/meew0/namida)

> namida is a tool for fast file downloads over high-latency and/or unreliable networks. It uses UDP for bulk data transmission, together with a minimal TCP control stream to mediate retransmission of lost data.

#### Namida vs Tsunami 对比

| 特性 | Tsunami (原版) | Namida (现代化) |
|------|---------------|-----------------|
| 语言 | C | Rust |
| 最后更新 | 2009 | 活跃维护 |
| CLI方式 | 交互式控制台 | 单命令完成 |
| NAT穿透 | ❌ | ✅ 默认支持 |
| 加密 | 可选 | ✅ 默认加密 (snow) |
| 断点续传 | ❌ | ✅ 自动支持 |
| 安装 | 源码编译 | Rust cargo |

#### Namida 安装与使用

```bash
# 安装 Rust（如果未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 安装 namida
cargo install --git https://github.com/meew0/namida.git

# 或源码编译
git clone https://github.com/meew0/namida.git
cd namida
cargo build --release

# 启动服务端
namida serve /data/training/

# 客户端下载（单文件）
namida get --server 192.168.1.100:5266 dataset.tar.gz

# 客户端下载（全部文件）
namida get --server 192.168.1.100:5266 --all

# 限制传输速率（避免占满带宽）
namida get --server 192.168.1.100:5266 --rate 100M dataset.tar.gz

# 查看服务端文件列表
namida dir --server 192.168.1.100:5266
```

#### Namida 关键参数

```bash
# 常用选项
--server, -s       # 指定服务端地址
--port, -p         # 指定端口（默认5266）
--rate, -r         # 限制传输速率（如 100M, 1G）
--all, -a          # 下载所有文件
--output, -o       # 输出文件路径
--verbose, -v      # 详细输出
--help, -h         # 帮助信息
```

#### Namida 完整备份脚本

```bash
#!/bin/bash
# ~/scripts/backup-namida.sh
# Namida 现代化UDP备份脚本

set -euo pipefail

NAS_HOST="192.168.1.100"
NAS_PORT="5266"
NAS_PATH="/backup/${USER}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
    "/data/experiments"
)
RATE_LIMIT="5G"  # 根据网络带宽调整
LOG_DIR="${HOME}/.local/share/backup/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [namida] $*" | tee -a "${LOG_DIR}/namida_$(date +%Y%m%d).log"
}

run_backup() {
    local src="$1"
    local filename=$(basename "${src}")
    
    if [ ! -d "${src}" ]; then
        log "跳过: ${src} 不存在"
        return 0
    fi
    
    log "备份: ${src} -> ${NAS_HOST}:${NAS_PATH}/${filename}"
    
    # Namida 传输（服务端需提前启动 namida serve）
    namida get \
        --server "${NAS_HOST}:${NAS_PORT}" \
        --rate "${RATE_LIMIT}" \
        --output "${NAS_PATH}/${filename}" \
        --verbose \
        "${filename}" 2>&1 | while read line; do
            log "  $line"
        done
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "完成: ${src}"
        # 删除源文件
        find "${src}" -type f -delete 2>/dev/null || true
    else
        log "错误: ${src}"
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== Namida备份开始 =========="
    log "目标: ${NAS_HOST}:${NAS_PORT}"
    log "速率限制: ${RATE_LIMIT}"
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== Namida备份完成 =========="
}

main "$@"
```

#### Namida Systemd 服务

```ini
# ~/.config/systemd/user/namida-serve.service
[Unit]
Description=Namida 文件传输服务
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=%h/.cargo/bin/namida serve /data/training/
Environment="NAMIDA_PORT=5266"
StandardOutput=append:%h/.local/share/backup/logs/namida.log
StandardError=append:%h/.local/share/backup/logs/namida.error.log
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
# 启用服务
systemctl --user daemon-reload
systemctl --user enable namida-serve.service
systemctl --user start namida-serve.service
```

#### Namida 选择建议

**推荐使用 Namida 的场景：**
- ✅ 新部署首选（现代化，维护活跃）
- ✅ 需要NAT穿透（客户端在NAT后）
- ✅ 需要加密传输
- ✅ 需要断点续传
- ✅ 追求代码安全（Rust内存安全）

**继续使用 Tsunami 的场景：**
- ⚠️ 已有Tsunami部署，迁移成本高
- ⚠️ 需要VLBI专用硬件支持
- ⚠️ 对二进制大小敏感（Rust编译产物较大）

### Tsunami 完整脚本

```bash
#!/bin/bash
# -/scripts/backup-tsunami.sh
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

### UDP方案使用建议

**推荐使用场景：**
- ✅ 10Gbps+ 局域网，零丢包
- ✅ 大文件连续传输（>1GB）
- ✅ 训练数据批量备份
- ✅ 对安全性要求低（内网）

**不推荐使用场景：**
- ❌ 网络质量不稳定（有丢包）
- ❌ 跨公网传输
- ❌ 数据完整性要求100%
- ❌ 需要穿越防火墙

### 综合推荐（速度优先）

| 网络环境 | 推荐方案 | 预期速度 | 原因 |
|----------|----------|----------|------|
| **优质局域网** | Tsunami UDP | **10~12 GB/s** | UDP满带宽 |
| **10Gbps局域网** | bbcp (无加密) | 9~11 GB/s | TCP稳定 |
| **1Gbps局域网** | bbcp | 900~1100 MB/s | 低CPU |
| **混合环境** | GridFTP | 8~9 GB/s | 可跨公网 |

---

## 详细部署落地方案

### 一、环境准备

#### 1.1 网络环境要求

```bash
# 检查网络带宽
iperf3 -c 192.168.1.100 -t 30

# 检查丢包率
iperf3 -c 192.168.1.100 -u -b 10G -t 30

# 检查MTU
ping -M do -s 8972 192.168.1.100

# 推荐网络配置
# - 10Gbps+ 网卡
# - MTU 9000 (Jumbo Frame)
# - 零丢包或 <0.01% 丢包率
# - 延迟 <1ms
```

#### 1.2 系统参数优化

```bash
# /etc/sysctl.conf

# 网络缓冲区调优
net.core.rmem_max = 536870912
net.core.wmem_max = 536870912
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 87380 536870912
net.ipv4.tcp_wmem = 4096 65536 536870912

# TCP窗口扩大
net.ipv4.tcp_window_scaling = 1

# 禁用TCP延迟确认
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_low_latency = 1

# UDP缓冲区
net.core.netdev_max_backlog = 50000

# 应用配置
sudo sysctl -p

# /etc/security/limits.conf
*    soft    nofile    1000000
*    hard    nofile    1000000
*    soft    memlock    unlimited
*    hard    memlock    unlimited
```

#### 1.3 网卡Jumbo Frame配置

```bash
# 检查当前MTU
ip link show eth0

# 设置MTU 9000（需要交换机支持Jumbo Frame）
sudo ip link set eth0 mtu 9000

# 持久化配置 /etc/network/interfaces
auto eth0
iface eth0 inet static
address 192.168.1.50
netmask 255.255.255.0
gateway 192.168.1.1
mtu 9000
```

### 二、安装部署

#### 2.1 bbcp 安装（所有节点）

```bash
# 方法1: apt安装
sudo apt update
sudo apt install -y bbcp

# 方法2: 源码编译（最新版本）
git clone https://github.com/ltp/bbcp.git
cd bbcp
make -j$(nproc)
sudo make install

# 验证安装
bbcp --version
```

#### 2.2 Tsunami UDP 安装（所有节点）

```bash
# 下载编译
cd /tmp
wget https://github.com/kthe/tsunami-udp/archive/refs/heads/master.zip
unzip master.zip
cd tsunami-udp-master
make -j$(ncpus)

# 安装到系统
sudo cp tsunami /usr/local/bin/
sudo chmod +x /usr/local/bin/tsunami
sudo mkdir -p /etc/tsunami
sudo cp tsunami.cfg /etc/tsunami/

# 验证安装
tsunami --help
```

#### 2.3 GridFTP 安装（NAS服务器）

```bash
# Globus Toolkit 安装
sudo apt install -y globus-toolkit

# 或使用Docker
docker run -d --name globus-endpoint \
  -p 2811:2811 \
  globusonline/globus-connect-server
```

### 三、配置部署

#### 3.1 SSH免密登录（bbcp用）

```bash
# 生成专用密钥（无加密）
ssh-keygen -t ed25519 -f -/.ssh/id_bbcp -N ""
ssh-keygen -t ed25519 -f -/.ssh/id_bbcp -p "" -P "" -f -/.ssh/id_bbcp

# 配置SSH（禁用加密加速）
cat >> -/.ssh/config <<EOF
Host nas
    HostName 192.168.1.100
    User backup
    IdentityFile -/.ssh/id_bbcp
    PasswordAuthentication no
    Ciphers none
    MACs none
    Compression no
    BatchMode yes
    StrictHostKeyChecking no
EOF

# 分发公钥到NAS
ssh-copy-id -i -/.ssh/id_bbcp.pub backup@192.168.1.100

# 测试连接
ssh -c none backup@192.168.1.100 "echo 'OK'"
```

#### 3.2 bbcp 完整部署脚本

```bash
#!/bin/bash
# -/scripts/deploy-bbcp.sh
# bbcp 一键部署脚本

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_HOST="192.168.1.100"
NAS_USER="backup"
NAS_PATH="/backup"
LOCAL_USER="${USER}"

echo "=== bbcp 部署脚本 ==="
echo "目标: ${NAS_USER}@${NAS_HOST}:${NAS_PATH}"

# 1. 安装bbcp
echo "[1/5] 安装bbcp..."
if ! command -v bbcp &> /dev/null; then
    sudo apt update
    sudo apt install -y bbcp || {
        cd /tmp
        git clone https://github.com/ltp/bbcp.git
        cd bbcp
        make -j$(nproc)
        sudo make install
    }
fi
echo "  bbcp版本: $(bbcp --version 2>&1 | head -1)"

# 2. 生成SSH密钥
echo "[2/5] 配置SSH密钥..."
mkdir -p -/.ssh
chmod 700 -/.ssh

if [ ! -f -/.ssh/id_bbcp ]; then
    ssh-keygen -t ed25519 -f -/.ssh/id_bbcp -N "" -q
fi
chmod 600 -/.ssh/id_bbcp

# 3. 配置SSH客户端
if ! grep -q "Ciphers none" -/.ssh/config 2>/dev/null; then
    cat >> -/.ssh/config <<EOF

Host ${NAS_HOST}
    HostName ${NAS_HOST}
    User ${NAS_USER}
    IdentityFile -/.ssh/id_bbcp
    Ciphers none
    MACs none
    Compression no
    BatchMode yes
    StrictHostKeyChecking no
EOF
fi

# 4. 分发公钥
echo "[3/5] 分发公钥到NAS..."
ssh-copy-id -i -/.ssh/id_bbcp.pub ${NAS_USER}@${NAS_HOST} || {
    echo "  警告: 公钥已存在或分发失败"
}

# 5. 创建目录结构
echo "[4/5] 创建备份目录..."
ssh ${NAS_USER}@${NAS_HOST} "mkdir -p ${NAS_PATH}/${LOCAL_USER}"

echo "[5/5] 测试连接..."
if ssh -c none ${NAS_USER}@${NAS_HOST} "echo 'OK'" | grep -q "OK"; then
    echo "  ✓ 连接成功"
else
    echo "  ✗ 连接失败，请检查网络或认证"
    exit 1
fi

echo ""
echo "=== 部署完成 ==="
echo "可用命令:"
echo "  bbcp -a -f -w 256M -S 'ssh -c none -x' /data/file ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/"
```

#### 3.3 Tsunami UDP 部署脚本

```bash
#!/bin/bash
# -/scripts/deploy-tsunami.sh
# Tsunami UDP 一键部署脚本

set -euo pipefail

NAS_HOST="192.168.1.100"
NAS_USER="backup"
NAS_PATH="/backup/$(whoami)"
INSTALL_DIR="/usr/local/bin"

echo "=== Tsunami UDP 部署脚本 ==="

# 1. 检查依赖
echo "[1/4] 检查依赖..."
for cmd in make g++; do
    if ! command -v $cmd &> /dev/null; then
        echo "  安装 $cmd..."
        sudo apt install -y build-essential
        break
    fi
done

# 2. 安装Tsunami
echo "[2/4] 安装Tsunami..."
if [ ! -f ${INSTALL_DIR}/tsunami ]; then
    cd /tmp
    rm -rf tsunami-udp-master
    wget -q https://github.com/kthe/tsunami-udp/archive/refs/heads/master.zip -O tsunami.zip
    unzip -q tsunami.zip
    cd tsunami-udp-master
    make -j$(nproc)
    sudo cp tsunami ${INSTALL_DIR}/
    sudo chmod +x ${INSTALL_DIR}/tsunami
fi
echo "  Tsunami版本: $(${INSTALL_DIR}/tsunami --help 2>&1 | head -1)"

# 3. 创建配置
echo "[3/4] 创建配置..."
sudo mkdir -p /etc/tsunami
sudo tee /etc/tsunami/tsunami.cfg > /dev/null <<EOF
# Tsunami UDP 配置
peer_ip             ${NAS_HOST}
peer_port           46200
socket_buffer_size  16777216
packet_size         1400
send_buffer_size    16777216
receive_buffer_size 16777216
max_pending_packets 10000
EOF

# 4. 远程部署（接收端）
echo "[4/4] 远程部署接收端..."
ssh ${NAS_USER}@${NAS_HOST} "
    mkdir -p ${NAS_PATH}
    mkdir -p -/.tsunami
    cat > -/.tsunami/tsunami.cfg <<CONFIG
peer_ip             0.0.0.0
peer_port           46200
socket_buffer_size  16777216
packet_size         1400
send_buffer_size    16777216
receive_buffer_size 16777216
max_pending_packets 10000
CONFIG
"

echo ""
echo "=== 部署完成 ==="
echo "使用方法:"
echo "  接收端: tsunami -> receive /backup/file"
echo "  发送端: tsunami -> set peer ${NAS_HOST} -> send /data/file"
```

### 四、Systemd 服务配置

#### 4.1 bbcp 定时备份服务

```ini
# -/.config/systemd/user/backup-bbcp.service
[Unit]
Description=训练数据备份 (bbcp极速版)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=%h/scripts/backup-bbcp-fast.sh
Environment="FORCE_BACKUP=false"
Environment="TCP_WINDOW=256M"
Environment="PARALLEL_STREAMS=8"
StandardOutput=append:%h/.local/share/backup/logs/backup.log
StandardError=append:%h/.local/share/backup/logs/backup.error.log

[Install]
WantedBy=default.target
```

```ini
# -/.config/systemd/user/backup-bbcp.timer
[Unit]
Description=每天22:00自动备份训练数据 (bbcp极速版)

[Timer]
OnCalendar=*-*-* 22:00:00
Persistent=true
RandomizedDelaySec=5min
AccuracySec=1min

[Install]
WantedBy=timers.target
```

```bash
# 启用服务
systemctl --user daemon-reload
systemctl --user enable backup-bbcp.timer
systemctl --user start backup-bbcp.timer

# 查看状态
systemctl --user list-timers
```

#### 4.2 Tsunami UDP 接收端常驻服务

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

```bash
# 部署接收端服务
sudo cp tsunami-receive.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tsunami-receive
sudo systemctl start tsunami-receive
```

### 五、备份脚本

#### 5.1 bbcp 完整备份脚本

```bash
#!/bin/bash
# -/scripts/backup-bbcp.sh
# 训练数据备份 - bbcp极速版

set -euo pipefail

# 配置
NAS_HOST="${NAS_HOST:-192.168.1.100}"
NAS_USER="${NAS_USER:-backup}"
NAS_PATH="${NAS_PATH:-/backup}"
TCP_WINDOW="${TCP_WINDOW:-256M}"
PARALLEL_STREAMS="${PARALLEL_STREAMS:-8}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
    "/data/experiments"
)
LOG_DIR="${HOME}/.local/share/backup/logs"
LOG_FILE="${LOG_DIR}/bbcp_$(date +%Y%m%d).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [bbcp] $*" | tee -a "${LOG_FILE}"
}

check_nas() {
    if ! ssh -c none -o BatchMode=yes ${NAS_USER}@${NAS_HOST} "test -w ${NAS_PATH}" 2>/dev/null; then
        log "错误: 无法访问NAS ${NAS_USER}@${NAS_HOST}:${NAS_PATH}"
        return 1
    fi
}

run_backup() {
    local src="$1"
    local dst="${NAS_USER}@${NAS_HOST}:${NAS_PATH}$(dirname ${src})"
    
    if [ ! -d "${src}" ]; then
        log "跳过: ${src} 不存在"
        return 0
    fi
    
    local file_count=$(find "${src}" -type f | wc -l)
    local total_size=$(du -sb "${src}" | cut -f1)
    
    log "开始备份: ${src}"
    log "  文件数: ${file_count}"
    log "  总大小: $(numfmt --to=iec ${total_size})"
    
    # bbcp极速传输
    bbcp -a -f -w "${TCP_WINDOW}" \
        -S "ssh -c none -x -o Compression=no -o BatchMode=yes" \
        --ignore-permissions \
        --verbose \
        "${src}/" \
        "${dst}/" \
        2>&1 | while read line; do
            log "  $line"
        done
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "完成: ${src}"
        log "删除源文件..."
        find "${src}" -type f -delete 2>/dev/null || true
    else
        log "错误: ${src}"
        return 1
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== bbcp备份开始 =========="
    log "目标: ${NAS_USER}@${NAS_HOST}:${NAS_PATH}"
    log "TCP窗口: ${TCP_WINDOW}, 并行流: ${PARALLEL_STREAMS}"
    
    check_nas || exit 1
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== bbcp备份完成 =========="
    
    # 输出统计
    ssh ${NAS_USER}@${NAS_HOST} "du -sh ${NAS_PATH}/*" | while read size dir; do
        log "  ${size} ${dir}"
    done
}

main "$@"
```

#### 5.2 Tsunami UDP 备份脚本

```bash
#!/bin/bash
# -/scripts/backup-tsunami.sh
# 训练数据备份 - Tsunami UDP极速版

set -euo pipefail

# 配置
NAS_HOST="${NAS_HOST:-192.168.1.100}"
NAS_PORT="${NAS_PORT:-46200}"
NAS_PATH="${NAS_PATH:-/backup}"
SOURCE_PATHS=(
    "/data/training"
    "/data/models"
)
LOG_DIR="${HOME}/.local/share/backup/logs"
LOG_FILE="${LOG_DIR}/tsunami_$(date +%Y%m%d).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [tsunami] $*" | tee -a "${LOG_FILE}"
}

run_backup() {
    local src="$1"
    
    if [ ! -d "${src}" ]; then
        log "跳过: ${src} 不存在"
        return 0
    fi
    
    log "开始备份: ${src} -> ${NAS_HOST}:${NAS_PATH}$(dirname ${src})"
    
    # Tsunami交互式命令
    {
        echo "set peer ${NAS_HOST}"
        echo "set port ${NAS_PORT}"
        echo "set buffer 16777216"
        echo "send ${src}/*"
        echo "quit"
    } | timeout 86400 tsunami 2>&1 | while read line; do
        log "  $line"
    done
    
    # 删除源文件（确认传输成功）
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "完成: ${src}"
        log "删除源文件..."
        find "${src}" -type f -delete 2>/dev/null || true
    else
        log "错误: ${src}"
    fi
}

main() {
    mkdir -p "${LOG_DIR}"
    log "========== Tsunami UDP备份开始 =========="
    log "目标: ${NAS_HOST}:${NAS_PORT}"
    
    for path in "${SOURCE_PATHS[@]}"; do
        run_backup "${path}"
    done
    
    log "========== Tsunami UDP备份完成 =========="
}

main "$@"
```

### 六、监控与告警

#### 6.1 传输监控脚本

```bash
#!/bin/bash
# -/scripts/monitor-transfer.sh
# 传输监控与告警

LOG_DIR="${HOME}/.local/share/backup/logs"
ALERT_EMAIL="admin@stars-labs.com"
NAS_HOST="192.168.1.100"

check_recent_backup() {
    local last_log=$(ls -t ${LOG_DIR}/bbcp_*.log 2>/dev/null | head -1)
    
    if [ -z "$last_log" ]; then
        echo "无备份记录"
        return 1
    fi
    
    local last_time=$(stat -c %Y "$last_log")
    local now=$(date +%s)
    local diff=$((now - last_time))
    
    if [ $diff -gt 86400 ]; then
        echo "警告: 超过24小时无备份 (${diff}s)"
        return 1
    fi
    
    echo "正常: 最后备份 ${diff}s 前"
    return 0
}

check_nas_space() {
    local space=$(ssh backup@${NAS_HOST} "df -h ${NAS_PATH} | tail -1" 2>/dev/null)
    echo "$space"
}

check_active_transfer() {
    local transfer=$(ps aux | grep -E "(bbcp|tsunami)" | grep -v grep | wc -l)
    if [ $transfer -gt 0 ]; then
        echo "运行中: $transfer 个传输进程"
    else
        echo "空闲"
    fi
}

main() {
    echo "=== 备份状态监控 ==="
    echo "时间: $(date)"
    echo ""
    
    echo "1. 备份状态:"
    check_recent_backup
    echo ""
    
    echo "2. NAS空间:"
    check_nas_space
    echo ""
    
    echo "3. 传输进程:"
    check_active_transfer
    echo ""
    
    echo "4. 最近日志:"
    ls -t ${LOG_DIR}/bbcp_*.log 2>/dev/null | head -3 | while read f; do
        echo "  $(basename $f): $(tail -1 $f 2>/dev/null)"
    done
}

main "$@"
```

#### 6.2 Prometheus 监控指标

```bash
#!/bin/bash
# -/scripts/backup-metrics.sh
# 导出Prometheus指标

LOG_DIR="${HOME}/.local/share/backup/logs"

# 最后备份时间
LAST_BACKUP=$(ls -t ${LOG_DIR}/bbcp_*.log 2>/dev/null | head -1 | xargs stat -c %Y 2>/dev/null || echo 0)
NOW=$(date +%s)
AGE=$((NOW - LAST_BACKUP))

cat <<EOF
# HELP backup_last_success_timestamp_seconds Unixtime of last successful backup
# TYPE backup_last_success_timestamp_seconds gauge
backup_last_success_timestamp_seconds $LAST_BACKUP

# HELP backup_age_seconds Seconds since last backup
# TYPE backup_age_seconds gauge
backup_age_seconds $AGE

# HELP backup_last_transfer_speed_bytes_per_second
# TYPE backup_last_transfer_speed_bytes_per_second gauge
backup_last_transfer_speed_bytes_per_second $(tail -50 ${LOG_DIR}/bbcp_*.log 2>/dev/null | grep -oP '\d+\s+bytes/s' | head -1 | awk '{print $1}' || echo 0)

# HELP backup_errors_total Total number of backup errors
# TYPE backup_errors_total counter
backup_errors_total $(grep -c "错误" ${LOG_DIR}/bbcp_*.log 2>/dev/null || echo 0)
EOF
```

### 七、故障排查

#### 7.1 常见问题

```bash
# 1. 连接失败
ssh -vvv -c none backup@192.168.1.100

# 2. 速度不达标
# 检查网络
iperf3 -c 192.168.1.100 -P 4 -t 30

# 检查CPU
top -bn1 | grep -E "(bbcp|ssh|encryption)"

# 检查磁盘IO
iotop -b -n 3

# 3. TCP窗口过小
# 检查系统配置
sysctl net.ipv4.tcp_rmem
sysctl net.core.rmem_max

# 4. MTU问题
ping -M do -s 8972 192.168.1.100

# 5. 文件权限
ls -la /data/training/
id
```

#### 7.2 性能调优检查清单

```bash
#!/bin/bash
# -/scripts/check-tuning.sh

echo "=== 性能调优检查 ==="

# 1. 网卡MTU
echo -n "MTU: "
ip link show eth0 | grep -oP 'mtu \K\d+'

# 2. TCP缓冲区
echo -n "TCP rmem_max: "
sysctl net.core.rmem_max 2>/dev/null | awk '{print $3}'

# 3. 打开文件数
echo -n "ulimit -n: "
ulimit -n

# 4. bbcp版本
bbcp --version 2>&1 | head -1

# 5. SSH加密
echo -n "SSH Ciphers: "
ssh -c none -o BatchMode=yes localhost "echo OK" 2>&1 | grep -q "OK" && echo "none可用" || echo "none不可用"

# 6. 网络带宽
echo "网络带宽测试:"
iperf3 -c 192.168.1.100 -t 5 -J | jq '.end.sum_sent.bits_per_second / 1e9'
```

### 八、部署检查清单

- [ ] 网络带宽测试通过 (>= 9Gbps)
- [ ] 丢包率 < 0.01%
- [ ] MTU 设置为 9000
- [ ] 系统参数已优化 (`net.core.rmem_max >= 536870912`)
- [ ] bbcp 安装完成并验证
- [ ] Tsunami UDP 安装完成（可选）
- [ ] SSH 免密登录配置完成
- [ ] NAS 目录权限配置正确
- [ ] 备份脚本测试通过
- [ ] Systemd Timer 启用
- [ ] 监控脚本配置完成
- [ ] 首次完整备份成功
- [ ] 恢复测试通过

### 九、回滚方案

```bash
#!/bin/bash
# -/scripts/rollback-bbcp.sh

echo "=== bbcp 回滚到 rclone ==="

# 切换到rclone
sed -i 's/bbcp/rclone/g' -/scripts/backup.sh
sed -i 's/--transfers.*/--transfers 8 \\/g' -/scripts/backup.sh

# 重启服务
systemctl --user stop backup-bbcp.timer
systemctl --user disable backup-bbcp.timer

systemctl --user enable backup-rclone.timer
systemctl --user start backup-rclone.timer

echo "已切换到rclone备份"
echo "查看状态: systemctl --user list-timers"
```

