---
sidebar_position: 1
---

# 网络架构概览

## 设计原则

- **分区管理**：核心区（认证+审计）与普通区（普通WiFi）分离
- **RADIUS认证**：核心区802.1X统一认证
- **安全审计**：核心区Port Mirror + DLP流量审计
- **简洁实用**：50人规模，适度简化
- **访客隔离**：访客网络与办公网络完全隔离

## 网络架构总览（50人规模）

```mermaid
graph TB
    subgraph "Internet 边界"
        ISP[电信宽带 500M]
        ROUTER[企业级路由器<br/>VPN/NAT/防火墙]
    end

    subgraph "核心接入区[RADIUS认证+审计]"
        CORE_SWITCH[8口PoE交换机<br/>USW-Lite-8-PoE / SG2008P]
        RADIUS[RADIUS服务器<br/>Casdoor]
        TAP[流量采集设备<br/>Port Mirror]
        DLP[DLP审计服务器<br/>数据防泄漏]
        MON[监控服务器<br/>日志分析]
        AP_CORE[无线AP 1-2<br/>核心区WiFi 802.1X]
    end

    subgraph "普通接入区[普通WiFi]"
        SWITCH2[普通交换机]
        AP_GUEST[无线AP 3-4<br/>普通WiFi]
        PC_GUEST[访客设备]
    end

    subgraph "服务器区"
        FILE[文件服务器<br/>NAS]
        BACKUP[备份存储]
    end

    subgraph "认证终端"
        PC1[办公PC 802.1X]
        LAPTOP[笔记本 802.1X]
        PHONE[IP电话]
    end

    %% 边界连接
    ISP --> ROUTER
    ROUTER --> CORE_SWITCH
    ROUTER --> SWITCH2

    %% 核心区连接
    CORE_SWITCH --> RADIUS
    CORE_SWITCH --> TAP
    TAP --> DLP
    TAP --> MON
    CORE_SWITCH --> AP_CORE
    CORE_SWITCH --> PC1
    CORE_SWITCH --> LAPTOP
    CORE_SWITCH --> PHONE
    CORE_SWITCH --> FILE
    CORE_SWITCH --> BACKUP

    %% 普通区连接
    SWITCH2 --> AP_GUEST
    SWITCH2 --> PC_GUEST

    %% RADIUS认证流量
    AP_CORE -.->|802.1X| RADIUS
    PC1 -.->|802.1X| RADIUS
    LAPTOP -.->|802.1X| RADIUS

    %% Port Mirror流量
    CORE_SWITCH ==Mirror==> TAP

    %% 样式
    style CORE_SWITCH fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style RADIUS fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style TAP fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style DLP fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style MON fill:#ffcccc,stroke:#ff0000,stroke-width:2px
```

## IP地址规划

| 网段 | 用途 | 容量 | 网关 |
|------|------|------|------|
| 192.168.1.0/24 | 核心区（认证+审计） | 200+ | 192.168.1.1 |
| 192.168.2.0/24 | 服务器区 | 50 | 192.168.2.1 |
| 192.168.3.0/24 | 普通区（访客） | 50 | 192.168.3.1 |

## 设备选型（50人规模）

### 核心设备清单

| 设备 | 型号 | 数量 | 单价 | 小计 | 用途 |
|------|------|------|------|------|------|
| 企业级路由器 | UniFi Dream Machine | 1 | ¥2000 | ¥2000 | VPN/NAT/防火墙 |
| 核心PoE交换机 | USW-Lite-8-PoE / SG2008P | 1 | ¥1000 | ¥1000 | 核心区PoE供电 |
| 普通交换机 | TL-SG1005D | 1 | ¥300 | ¥300 | 普通区接入 |
| 核心区AP | UniFi U6-LR | 2 | ¥1500 | ¥3000 | 核心区802.1X WiFi |
| 普通区AP | UniFi U6-Lite | 2 | ¥800 | ¥1600 | 普通WiFi |
| RADIUS服务器 | 虚拟机 | 1 | - | - | 统一认证 |
| DLP服务器 | 虚拟机 | 1 | - | - | 流量审计 |
| NAS存储 | 群晖DS220+ | 1 | ¥3000 | ¥3000 | 文件共享 |

### 预算参考

| 类别 | 预算范围 |
|------|----------|
| 网络设备（核心+普通） | ¥8,000-12,000 |
| 无线覆盖（4 AP） | ¥5,000-7,000 |
| 服务器（虚拟机） | ¥0（已有） |
| NAS存储 | ¥3,000-5,000 |
| **总计** | **¥16,000-24,000** |
