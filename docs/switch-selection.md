---
sidebar_position: 3
---

# 交换机选型方案

## 选型原则

- **性能需求**：根据网络流量规模选择合适的转发能力
- **扩展性**：支持堆叠/Virtual Stacking，便于后期扩展
- **管理性**：支持SNMP、RMON、CLI、Web管理
- **可靠性**：支持冗余电源、风扇，支持快速收敛协议
- **成本效益**：在满足需求的前提下选择高性价比产品

## 核心交换机选型

### 推荐型号：Huawei CloudEngine S5735-L系列 或 Cisco Catalyst 9200系列

| 参数 | 规格要求 |
|------|----------|
| 交换容量 | ≥6.4Tbps |
| 包转发率 | ≥250Mpps |
| 端口密度 | 48个10/100/1000M + 4个10G SFP+ |
| 堆叠能力 | 支持堆叠虚拟化技术，最大16台 |
| 冗余 | 双电源冗余，双风扇冗余 |
| 管理接口 | Console、USB、RJ45 |

### 核心交换机配置要点

1. **VLAN配置**
   - 管理VLAN：VLAN 100 (192.168.100.0/24)
   - 服务器VLAN：VLAN 200 (192.168.200.0/24)
   - 用户VLAN：VLAN 300-320 (192.168.3x.0/24)
   - DMZ区域：VLAN 400 (192.168.400.0/24)

2. **路由配置**
   - 启用OSPF动态路由
   - 配置默认路由指向防火墙
   - 启用路由重分发

3. **冗余配置**
   - 部署MSTP/RSTP防环路
   - 配置VRRP网关冗余
   - 启用BFD快速检测

## 汇聚交换机选型

### 推荐型号：Huawei CloudEngine S5735-S系列 或 H3C S5130系列

| 参数 | 规格要求 |
|------|----------|
| 交换容量 | ≥1.2Tbps |
| 包转发率 | ≥50Mpps |
| 端口密度 | 48个10/100/1000M + 4个10G SFP+ |
| 堆叠能力 | 支持堆叠，最大8台 |
| PoE+ | 可选 (若需给AP供电) |

## 接入交换机选型

### 推荐型号：Huawei CloudEngine S5735-L1系列 或 TP-Link T1600G系列

| 参数 | 规格要求 |
|------|交换容量 | ≥----------|
| 240Gbps |
| 包转发率 | ≥10Mpps |
| 端口密度 | 24或48个10/100/1000M |
| 上行端口 | 2-4个1G/10G SFP |
| PoE+ | 按需选择 (802.3at，30W/口) |

## 端口规划示例

### 核心交换机端口规划

| 端口号 | 用途 | 备注 |
|--------|------|------|
| GE1/0/1-2 | 防火墙互联 | LACP链路聚合 |
| GE1/0/3-4 | 服务器区汇聚1 | LACP |
| GE1/0/5-6 | 服务器区汇聚2 | LACP |
| GE1/0/7-10 | 办公区汇聚1-4 | LACP |
| GE1/0/11-12 | 无线控制器 | LACP |
| GE1/0/13-20 | 预留扩展 | - |

### 接入交换机端口规划

| 端口号 | 用途 | 备注 |
|--------|------|------|
| GE0/0/1-20 | 工作站/PC | 802.1X认证 |
| GE0/0/21-24 | IP电话/无线AP | POE供电 |
| GE0/0/25-26 | 上行链路 | LACP堆叠 |
| GE0/0/27-28 | 预留 | - |

## 交换机管理配置

### SNMP配置

```bash
snmp-agent community read StarsLabs2024
snmp-agent community write StarsLabs2024@write
snmp-agent sys-info version v2c v3
snmp-agent target-host trap-hostname NMS address 192.168.100.100 udp-port 161 trap-paramsname SNMP-TRAP
```

### 账户安全配置

```bash
local-user admin password cipher your_secure_password
local-user admin privilege level 3
local-user admin service-type ssh telnet web
aaa
authentication-scheme default
authorization-scheme default
accounting-scheme default
domain default
```

## 验收标准

- [ ] 所有交换机可通过NMS系统监控
- [ ] 堆叠配置生效，设备统一管理
- [ ] 端口链路聚合配置正确，带宽达标
- [ ] VLAN间路由正常
- [ ] 冗余机制测试通过（模拟链路故障）
- [ ] SNMP监控指标完整
- [ ] 配置文件已备份
