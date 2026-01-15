---
sidebar_position: 5
---

# 服务器选型方案

## 选型原则

- **业务需求驱动**：根据业务负载选择合适配置
- **性价比优先**：在满足性能需求前提下选择最优配置
- **扩展性考虑**：预留扩展空间，支持在线扩容
- **品牌可靠性**：选择主流品牌，保障服务质量
- **能耗效率**：选择节能型号，降低运营成本

## 服务器分类与需求

### 应用服务器

| 配置项 | 入门级 | 标准级 | 高性能级 |
|--------|--------|--------|----------|
| CPU | Intel Xeon E-2300系列 | Intel Xeon Silver 4314 | Intel Xeon Gold 6330 |
| 内存 | 32GB DDR4 | 64GB DDR4 | 128GB DDR4 |
| 存储 | 2×480GB SSD | 4×960GB SSD | 8×1.92TB NVMe |
| 网络 | 2×1GbE | 2×10GbE | 4×10GbE |
| 电源 | 500W冗余 | 800W冗余 | 1200W冗余 |

### 数据库服务器

| 配置项 | 入门级 | 标准级 | 高性能级 |
|--------|--------|--------|----------|
| CPU | 2×Xeon Silver 4314 | 2×Xeon Gold 5318Y | 2×Xeon Platinum 8352Y |
| 内存 | 128GB DDR4 | 256GB DDR4 | 512GB DDR4 |
| 存储 | 8×960GB SSD RAID10 | 12×1.92TB NVMe | 24×3.84TB NVMe |
| 网络 | 2×10GbE | 4×10GbE | 2×25GbE |
| 电源 | 800W冗余 | 1200W冗余 | 1600W冗余 |

### 文件服务器

| 配置项 | 入门级 | 标准级 | 大容量级 |
|--------|--------|--------|----------|
| CPU | Intel Xeon E-2300系列 | Intel Xeon Silver 4314 | Intel Xeon Gold 5318Y |
| 内存 | 32GB DDR4 | 64GB DDR4 | 128GB DDR4 |
| 存储 | 4×4TB HDD | 8×8TB HDD | 12×16TB HDD |
| 网络 | 2×1GbE | 2×10GbE | 4×10GbE |
| HBA | - | SAS HBA | SAS HBA + 扩展柜 |

## 推荐配置方案

### 虚拟化主机（VMware/Hyper-V）

| 组件 | 推荐配置 |
|------|----------|
| CPU | 2× Intel Xeon Gold 5318Y (48核心/96线程) |
| 内存 | 512GB DDR4 ECC |
| 存储 | 4× 1.92TB NVMe SSD (RAID10) |
| 网络 | 4× 10GbE SFP+ |
| 电源 | 1200W 80Plus Titanium |
| 散热 | 冗余风扇 |

### 数据库服务器（MySQL/PostgreSQL）

| 组件 | 推荐配置 |
|------|----------|
| CPU | 2× Intel Xeon Gold 6330 (56核心/112线程) |
| 内存 | 512GB DDR4 ECC (支持AEP可选) |
| 存储 | 8× 3.84TB NVMe SSD (RAID10) |
| 网络 | 2× 25GbE SFP28 |
| 电源 | 1600W 80Plus Titanium |
| 阵列卡 | RAID 9361-8i |

### Web应用服务器

| 组件 | 推荐配置 |
|------|----------|
| CPU | 2× Intel Xeon Silver 4314 (32核心/64线程) |
| 内存 | 128GB DDR4 ECC |
| 存储 | 2× 960GB SSD (RAID1) |
| 网络 | 2× 10GbE SFP+ |
| 电源 | 800W 80Plus Platinum |

### 文件存储服务器

| 组件 | 推荐配置 |
|------|----------|
| CPU | 2× Intel Xeon Silver 4314 (32核心/64线程) |
| 内存 | 64GB DDR4 ECC |
| 存储 | 12× 16TB SATA HDD (RAID6) |
| 网络 | 2× 10GbE SFP+ |
| 扩展 | 2× 12Gb/s SAS扩展口 |
| HBA | SAS 9400-16i |

## 品牌推荐

| 品牌 | 优势 | 适用场景 |
|------|------|----------|
| Dell EMC | 成熟方案，全球服务 | 全场景 |
| HPE ProLiant | 企业级品质，优秀管理 | 企业关键业务 |
| 浪潮 | 国产化，性价比高 | 通用场景 |
| 华为TaiShan | 国产化，自主可控 | 政府/敏感行业 |
| Lenovo ThinkSystem | 创新设计，灵活配置 | 全场景 |

## 服务器管理

### iDRAC/iLO配置

```bash
# 设置管理IP
setniccfg -s 192.168.0.100 255.255.255.0 192.168.0.1

# 启用SNMP
racadm set iDRAC.Nic.Enable 1
racadm set iDRAC.Nic.IPAddress 192.168.0.100
racadm set iDRAC.Nic.Netmask 255.255.255.0
racadm set iDRAC.Nic.Gateway 192.168.0.1
racadm set iDRAC SNMP Agent 1
racadm set iDRAC SNMP CommunityString StarsLabs2024
```

### 固件更新

```bash
# Dell
racadm update -f firmware.exe

# HPE
hpsum /f /b /s

# 华为
ibsma -f firmware.bin
```

## 验收测试

### 硬件检测

- [ ] CPU压力测试（满载运行4小时）
- [ ] 内存检测（memtest通过）
- [ ] 硬盘健康检测（SMART状态正常）
- [ ] 网络端口测试（环回测试通过）
- [ ] 电源冗余测试（单电源故障切换）

### 操作系统测试

- [ ] 系统安装正常
- [ ] 驱动安装完整
- [ ] 固件版本符合要求
- [ ] 远程管理可用
- [ ] 告警功能正常

### 性能基准

- [ ] CPU Cinebench分数达标
- [ ] 内存带宽符合预期
- [ ] 存储IOPS满足要求
- [ ] 网络带宽满足要求
