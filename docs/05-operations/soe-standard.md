---
sidebar_position: 1
---

# 桌面终端标准化规范 (SOE)

标准操作环境 (Standard Operating Environment, SOE) 旨在减少 IT 运维复杂性，确保公司所有终端设备的安全性与一致性。所有新发放设备必须符合本规范。

## 1. 操作系统标准

| 平台 | 版本要求 | 适用人群 |
| :--- | :--- | :--- |
| **macOS** | 最新稳定版 (n) 或 n-1 版本 | 研发、设计、产品、高管 |
| **Windows** | Windows 11 专业版/企业版 (22H2+) | 财务、HR、行政、销售 |
| **Linux** | Ubuntu 22.04 LTS Desktop | 特定算法、运维岗位 |

## 2. 预装软件清单 (Base Image)

所有设备交付前必须安装以下软件：

### 2.1 安全与管理 (强制)
*   **Fleet Agent**: 终端管理与遥测。
*   **WireGuard**: 内网 VPN 客户端。
*   **EDR/杀毒软件**: (如有采购) 或启用系统自带 Defender/XProtect。

### 2.2 办公协作 (强制)
*   **浏览器**: Google Chrome (设为默认) & Firefox。
*   **沟通**: Mattermost 客户端。
*   **文档**: Nextcloud 同步客户端。
*   **会议**: Jitsi Meet (Web端) 或 OBS (如需)。

### 2.3 研发工具 (仅研发组)
*   **IDE**: VS Code (含公司标准插件包)。
*   **环境**: Docker Desktop / Podman。
*   **终端**: iTerm2 (Mac) / Windows Terminal。
*   **Git**: 配置好全局 `.gitconfig` (禁止使用非公司邮箱 commit)。

## 3. 系统配置基线 (Configuration Baseline)

通过 Fleet 策略或 MDM 配置文件强制下发以下设置：

### 3.1 安全加固
*   **磁盘加密**:
    *   macOS: 强制开启 **FileVault**。
    *   Windows: 强制开启 **BitLocker**。
*   **自动锁屏**: 无操作 **15分钟** 后自动锁定屏幕。
*   **防火墙**: 启用系统自带防火墙。
*   **访客账户**: 禁用 Guest 用户。

### 3.2 审计与监控
*   禁止用户自行卸载 Fleet Agent。
*   开启系统日志审计。

## 4. 软件黑名单 (Prohibited Software)

禁止在公司设备上安装或运行以下软件：
*   **P2P 下载工具**: (如迅雷、BitTorrent) - 防止带宽滥用与版权风险。
*   **远程控制软件**: (如 TeamViewer、AnyDesk) - 除非 IT 部门授权使用。
*   **盗版/破解软件**: 严禁使用 Keygen 或 Crack 工具。
*   **游戏客户端**: Steam, Epic 等。

## 5. 补丁更新策略
*   **操作系统**: 延迟 7 天自动更新 (确保兼容性)，关键安全补丁 24 小时内强制更新。
*   **浏览器**: 强制开启自动更新。
