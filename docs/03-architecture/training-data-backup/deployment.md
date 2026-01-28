---
sidebar_position: 5
---

# 部署与调优指南

为了达到 10Gbps+ 的传输速度，仅仅选择正确的软件是不够的，还需要对操作系统内核网络栈进行调优。

## 1. 系统参数调优 (Sysctl)

在所有节点（服务器和高性能客户端）上应用以下配置：

```bash
# /etc/sysctl.conf

# 网络缓冲区调优 - 允许更大的 TCP 窗口
net.core.rmem_max = 536870912
net.core.wmem_max = 536870912
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 87380 536870912
net.ipv4.tcp_wmem = 4096 65536 536870912

# 启用 TCP 窗口扩大因子 (Window Scaling)
net.ipv4.tcp_window_scaling = 1

# 禁用 TCP 延迟确认 (降低延迟)
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_low_latency = 1

# UDP 缓冲区 (Namida/Tsunami 需要)
net.core.netdev_max_backlog = 50000

# 应用配置
sudo sysctl -p
```

同时修改 Limits 配置：

```bash
# /etc/security/limits.conf
*    soft    nofile    1000000
*    hard    nofile    1000000
*    soft    memlock    unlimited
*    hard    memlock    unlimited
```

## 2. 网卡巨型帧 (Jumbo Frame)

如果交换机支持，开启 Jumbo Frame (MTU 9000) 可以显著降低 CPU 负载并提升吞吐量。

```bash
# 临时设置
sudo ip link set eth0 mtu 9000

# 持久化配置 (/etc/network/interfaces)
auto eth0
iface eth0 inet static
  ...
  mtu 9000
```

## 3. SSH 免密登录配置 (bbcp 用)

bbcp 依赖 SSH 进行控制信道通信。推荐配置专用的、无加密的 SSH 通道以提升速度（仅限内网）。

```bash
# 1. 生成专用密钥
ssh-keygen -t ed25519 -f ~/.ssh/id_bbcp -N ""

# 2. 配置 SSH 客户端 (~/.ssh/config)
Host nas
    HostName 192.168.1.100
    User backup
    IdentityFile ~/.ssh/id_bbcp
    # 关键：禁用加密算法
    Ciphers none
    MACs none
    Compression no
    BatchMode yes
    StrictHostKeyChecking no

# 3. 分发公钥
ssh-copy-id -i ~/.ssh/id_bbcp.pub backup@192.168.1.100
```

## 4. 自动化定时任务

推荐使用 Systemd Timer 替代 Crontab，以便更好地管理日志和依赖。

```ini
# ~/.config/systemd/user/backup-bbcp.service
[Unit]
Description=训练数据备份 (bbcp极速版)
After=network-online.target

[Service]
Type=oneshot
ExecStart=%h/scripts/backup-bbcp-fast.sh
StandardOutput=append:%h/.local/share/backup/logs/backup.log
StandardError=append:%h/.local/share/backup/logs/backup.error.log

[Install]
WantedBy=default.target
```

```ini
# ~/.config/systemd/user/backup-bbcp.timer
[Unit]
Description=每天22:00自动备份训练数据

[Timer]
OnCalendar=*-*-* 22:00:00
Persistent=true
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
```
