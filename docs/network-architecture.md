---
sidebar_position: 4
---

# 网络架构设计

## 设计原则

- **层次化**：采用三层网络架构（核心-汇聚-接入）
- **高可用**：关键链路冗余，消除单点故障
- **可扩展**：预留扩展空间，便于后期扩容
- **安全性**：分区隔离，访问控制
- **可管理**：统一管理，监控可视化

## 网络架构总览

```mermaid
graph TB
    subgraph "Internet 边界"
        ISP1[电信 ISP]
        ISP2[联通 ISP]
        FW[企业级防火墙]
        IPS[入侵防御系统 IPS]
    end

    subgraph "核心保密区域[安全监控区]"
        CORE1[核心交换机1<br/>L3路由/MSTP/VRRP]
        CORE2[核心交换机2<br/>L3路由/MSTP/VRRP]
        MON[监控审计服务器<br/>日志分析/异常检测]
        DLP[DLP服务器<br/>数据防泄漏/内容审计]
        TAP[流量采集设备<br/>Port Mirror/SPAN]
    end

    subgraph "汇聚层[接入控制]"
        AGG1[汇聚交换机1<br/>VLAN间路由/ACL]
        AGG2[汇聚交换机2<br/>VLAN间路由/ACL]
        AGG3[汇聚交换机3<br/>PoE供电/AP管理]
        AGG4[汇聚交换机4<br/>PoE供电/AP管理]
    end

    subgraph "接入层[终端接入]"
        ACC1[接入交换机1<br/>802.1X认证/PoE]
        ACC2[接入交换机2<br/>802.1X认证/PoE]
        ACC3[接入交换机3<br/>802.1X认证/PoE]
        ACC4[接入交换机4<br/>802.1X认证/PoE]
    end

    subgraph "服务器区"
        SRV1[应用服务器]
        SRV2[数据库服务器]
        SRV3[文件服务器]
        NAS[NAS存储]
    end

    subgraph "终端设备"
        PC1[办公PC]
        PC2[研发PC]
        AP1[无线AP]
        IPPhone[IP电话]
        IPcam[IP摄像头]
    end

    %% 边界连接
    ISP1 --> FW
    ISP2 --> FW
    FW --> IPS
    IPS --> CORE1
    IPS --> CORE2

    %% 核心层互联
    CORE1 <--> CORE2
    CORE1 --> TAP
    CORE2 --> TAP
    TAP --> MON
    TAP --> DLP

    %% 核心到汇聚
    CORE1 --> AGG1
    CORE1 --> AGG2
    CORE2 --> AGG3
    CORE2 --> AGG4

    %% 汇聚到接入
    AGG1 --> ACC1
    AGG1 --> ACC2
    AGG3 --> ACC3
    AGG3 --> ACC4

    %% 服务器连接
    AGG2 --> SRV1
    AGG2 --> SRV2
    AGG2 --> SRV3
    AGG2 --> NAS

    %% 终端连接
    ACC1 --> PC1
    ACC1 --> PC2
    ACC2 --> AP1
    ACC2 --> IPPhone
    ACC2 --> IPcam

    %% 汇聚到AP
    AGG3 --> AP1
    AGG4 --> AP1

    %% 保密区域流量镜像
    style CORE1 fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style CORE2 fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style TAP fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style MON fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style DLP fill:#ffcccc,stroke:#ff0000,stroke-width:2px
```

## 核心保密区域设计

### 区域概述

核心保密区域是网络的核心枢纽，承担以下关键职责：

| 组件 | 功能 | 重要性 |
|------|------|--------|
| **核心交换机** | 三层路由、MSTP防环、VRRP冗余 | 核心 |
| **流量采集(TAP)** | Port Mirror镜像关键流量 | 监控基础 |
| **DLP服务器** | 数据防泄漏、内容审计 | 安全核心 |
| **监控审计服务器** | 日志分析、异常检测、告警 | 运维核心 |

### Port Mirror 配置

在核心交换机上配置流量镜像，将关键流量复制到DLP和监控系统：

```bash
# 镜像服务器区流量到DLP
observe-port 1 interface GigabitEthernet0/0/24
 port-mirroring to observe-port 1 inbound GigabitEthernet0/0/1
 port-mirroring to observe-port 1 outbound GigabitEthernet0/0/1

# 镜像互联网出口流量
observe-port 2 interface GigabitEthernet0/0/23
 port-mirroring to observe-port 2 inbound GigabitEthernet0/0/10
 port-mirroring to observe-port 2 outbound GigabitEthernet0/0/10

# 镜像管理网流量
observe-port 3 interface GigabitEthernet0/0/22
 port-mirroring to observe-port 3 inbound GigabitEthernet0/0/5
 port-mirroring to observe-port 3 outbound GigabitEthernet0/0/5
```

### 流量监控策略

| 监控对象 | 镜像源 | 目的 | 审计内容 |
|----------|--------|------|----------|
| 服务器区 | 核心交换机 uplink | DLP | 数据外发、敏感文件传输 |
| 互联网出口 | 防火墙 uplink | DLP | 恶意URL、敏感数据外泄 |
| 管理网络 | 核心交换机管理口 | 监控系统 | 异常登录、配置变更 |
| 数据库 | 数据库服务器端口 | DLP | SQL查询、批量导出 |
| 研发区 | 汇聚交换机 | DLP | 代码外发、图纸外传 |

## IP地址规划

### 地址段分配

| 网段 | 用途 | 掩码 | 网关 |
|------|------|------|------|
| 192.168.0.0/24 | 设备管理网 | 255.255.255.0 | 192.168.0.1 |
| 192.168.1.0/24 | 服务器区 | 255.255.255.0 | 192.168.1.1 |
| 192.168.10.0/22 | 办公用户区 | 255.255.252.0 | 192.168.10.1 |
| 192.168.20.0/22 | 研发用户区 | 255.255.252.0 | 192.168.20.1 |
| 192.168.30.0/22 | 访客无线区 | 255.255.252.0 | 192.168.30.1 |
| 192.168.100.0/24 | DMZ区域 | 255.255.255.0 | 192.168.100.1 |
| 10.0.0.0/16 | 业务系统 | 255.255.0.0 | 10.0.0.1 |

### VLAN划分

| VLAN ID | 名称 | 网段 | 用途 |
|---------|------|------|------|
| 1 | 默认VLAN | - | 禁止使用 |
| 10 | MGMT | 192.168.0.0/24 | 设备管理 |
| 20 | SERVERS | 192.168.1.0/24 | 服务器 |
| 30 | OFFICE | 192.168.10.0/22 | 办公用户 |
| 40 | R&D | 192.168.20.0/22 | 研发用户 |
| 50 | GUEST | 192.168.30.0/22 | 访客无线 |
| 100 | DMZ | 192.168.100.0/24 | 对外服务 |
| 200 | VOICE | 192.168.200.0/24 | IP电话 |
| 999 | ISOLATE | - | 隔离VLAN |

## 路由设计

### 静态路由配置

```bash
# 默认路由
ip route-static 0.0.0.0 0.0.0.0 192.168.100.254

# 办公网段路由
ip route-static 192.168.10.0 255.255.252.0 192.168.0.254
ip route-static 192.168.20.0 255.255.252.0 192.168.0.254

# 服务器区路由
ip route-static 192.168.1.0 255.255.255.0 192.168.0.254
```

### OSPF动态路由配置

```bash
ospf 1 router-id 192.168.0.1
 area 0.0.0.0
  network 192.168.0.0 0.0.255.255
 default-route-advertise
```

## 冗余设计

### MSTP配置

```bash
stp region-configuration
 region-name StarsLabs
 revision-level 1
 instance 1 vlan 10 20 100 200
 instance 2 vlan 30 40 50
 active region-configuration
#
stp instance 1 priority 4096
stp instance 2 priority 8192
```

### VRRP配置

```bash
interface Vlanif10
 ip address 192.168.0.1 255.255.255.0
 vrrp vrid 10 virtual-ip 192.168.0.254
 vrrp vrid 10 priority 120
 vrrp vrid 10 preempt-mode timer delay 30
 vrrp vrid 10 track interface GigabitEthernet0/0/1 reduced 30
```

## 访问控制策略

### 基础ACL配置

```bash
# 禁止访客访问服务器区
acl number 3001
 rule 10 deny ip source 192.168.30.0 0.0.3.255 destination 192.168.1.0 0.0.0.255
 rule 20 permit ip source any
 
# 禁止用户访问管理网
acl number 3002
 rule 10 deny ip source 192.168.10.0 0.0.3.255 destination 192.168.0.0 0.0.0.255
 rule 20 permit ip any
```

## 无线网络设计

### 无线覆盖规划

| 区域 | AP数量 | SSID | 认证方式 |
|------|--------|------|----------|
| 办公区 | 按需 | StarsLabs-Office | 802.1X |
| 会议室 | 2-4/间 | StarsLabs-Office | 802.1X |
| 公共区域 | 1-2/区域 | StarsLabs-Guest | Portal认证 |
| 仓库区 | 1-2/仓库 | StarsLabs-Device | WPA2-PSK |

### 无线控制器配置要点

- 配置AP组，统一管理
- 启用负载均衡
- 配置无线入侵检测
- 启用频谱分析
- 配置无线用户隔离（访客网络）

## 网络监控与运维

### 监控指标

- 端口流量（入/出）
- 端口错误包统计
- CPU/内存利用率
- 设备温度
- 电源状态
- 链路状态

### 告警配置

- 端口down：立即告警
- 流量超过80%阈值：预警
- 链路错误率>0.1%：告警
- 设备温度>50℃：预警

## DLP数据防泄漏方案

### DLP部署架构

```mermaid
graph LR
    subgraph "流量来源"
        TAP[流量采集设备<br/>Port Mirror]
    end

    subgraph "DLP分析平台"
        DLP[DLP服务器<br/>内容识别引擎]
        DB[特征库<br/>敏感数据指纹]
        ENGINE[检测引擎<br/>正则/关键词/机器学习]
    end

    subgraph "响应处置"
        BLOCK[阻断设备<br///防火墙联动]
        ALERT[告警系统<br/>邮件/短信/Slack]
        LOG[审计日志<br///合规留存]
    end

    TAP -->|镜像流量| DLP
    DLP -->|特征匹配| DB
    DLP -->|深度检测| ENGINE
    ENGINE -->|命中策略| BLOCK
    ENGINE -->|告警事件| ALERT
    ENGINE -->|审计记录| LOG
```

### DLP检测策略

| 策略类型 | 检测规则 | 响应动作 |
|----------|----------|----------|
| **敏感文件识别** | 身份证号、银行卡号、手机号 | 阻断+告警 |
| **代码外泄** | Git仓库URL、API密钥 | 阻断+告警 |
| **设计图纸** | CAD文件特征、蓝图格式 | 阻断+审计 |
| **商业机密** | 合同模板、财务数据 | 阻断+告警+日志 |
| **个人隐私** | 社保号、护照号、驾照号 | 阻断+告警 |

### DLP服务器配置

```bash
# DLP服务器网络配置
ip addr: 192.168.0.200/24
gateway: 192.168.0.254
management: 192.168.0.200:8443

# 监控网卡配置
interface: eth1 (镜像流量入口)
mode: Passive (只读不转发)

# 联动防火墙配置
firewall_ip: 192.168.100.254
api_key: dlp_api_key_xxxxx
action: block/allow
```

### 审计日志保留

| 日志类型 | 保留期限 | 存储位置 |
|----------|----------|----------|
| 阻断日志 | 1年 | 本地存储 + 异地备份 |
| 告警日志 | 1年 | SIEM平台 |
| 审计追溯 | 7年 | 归档存储 |
| 合规报表 | 永久 | 法务合规系统 |
