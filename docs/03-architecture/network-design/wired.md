---
sidebar_position: 2
---

# 有线网络与 VLAN

## 区域划分说明

### 核心接入区（审计区域）

| 设备 | 用途 | 认证方式 | 审计 |
|------|------|----------|------|
| PC/笔记本 | 员工办公设备 | 802.1X/RADIUS | Port Mirror → DLP |
| IP电话 | 语音通信 | 802.1X/RADIUS | 记录 |
| 核心区AP | 管理区域WiFi | 802.1X/RADIUS | Port Mirror → DLP |
| 文件服务器 | 敏感数据存储 | IP白名单 | 全流量审计 |

### 普通接入区（普通区域）

| 设备 | 用途 | 认证方式 | 审计 |
|------|------|----------|------|
| 访客AP | 来访人员 | Portal认证 | 仅日志 |
| 普通PC | 临时设备 | MAC认证 | 仅记录 |

## Port Mirror 流量审计设计

### 核心区流量镜像配置

```bash
# 核心交换机配置（以TP-Link SG2008P为例）

# 镜像所有核心区流量到TAP设备
observe-port 1 interface GigabitEthernet0/0/8

# 镜像办公PC上行流量
port-mirroring to observe-port 1 inbound GigabitEthernet0/0/1
port-mirroring to observe-port 1 outbound GigabitEthernet0/0/1

# 镜像服务器区流量
port-mirroring to observe-port 1 inbound GigabitEthernet0/0/6
port-mirroring to observe-port 1 outbound GigabitEthernet0/0/6

# 镜像核心WiFi流量
port-mirroring to observe-port 1 inbound GigabitEthernet0/0/3
port-mirroring to observe-port 1 outbound GigabitEthernet0/0/3
```

### 镜像策略表

| 镜像源端口 | 用途 | 审计内容 | 保留期限 |
|------------|------|----------|----------|
| GE0/0/1 | 办公PC 1 | 文件传输、网页 | 90天 |
| GE0/0/2 | 办公PC 2 | 文件传输、网页 | 90天 |
| GE0/0/3 | 核心AP | 无线流量 | 90天 |
| GE0/0/6 | 文件服务器 | SMB/NFS访问 | 180天 |
| GE0/0/7 | 认证服务器 | RADIUS认证日志 | 180天 |

## 交换机 RADIUS 配置

```bash
# TP-Link SG2008P
radius-server ip 192.168.1.100 port 1812 key your_shared_secret
dot1x authentication-method eap
authentication dot1x domain example.com

# 核心区端口启用802.1X
interface GigabitEthernet 1/0/1
  dot1x port-control auto
  dot1x re-authenticate
  port-security max 1
```
