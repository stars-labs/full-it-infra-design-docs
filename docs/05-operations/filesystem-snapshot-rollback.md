---
sidebar_position: 3
---

# 文件系统快照与升级回滚 SOP

## 为什么需要快照回滚？

在对服务器执行**高风险升级**（如数据库内核、glibc、OpenSSL）时，传统备份恢复可能需要数小时。而 **Btrfs / ZFS** 文件系统基于 **COW (Copy-on-Write)** 机制，可以：

- **秒级创建快照** — 快照不复制数据，只记录元数据指针，几乎不占空间
- **秒级回滚** — 回滚只是切换指针，不需要还原数据
- **原子性保证** — 回滚是全有或全无的，不存在"恢复到一半"的状态

:::important 关键要求
**服务器操作系统应使用 Btrfs 或 ZFS 文件系统，避免在关键服务器上使用 ext4。** ext4 不支持原生快照，无法实现秒级回滚。
:::

## 核心原理

### COW (Copy-on-Write) 机制

传统文件系统（ext4）修改文件时**直接覆盖**原始数据块。而 COW 文件系统的工作方式不同：

1. **写入时**：不覆盖旧数据,而是把新数据写到新的空闲块，然后更新指针
2. **创建快照时**：只需冻结当前的指针树，几乎零开销
3. **回滚时**：把指针树切回快照的版本，瞬间恢复

```
升级前快照:   指针树 A → [旧数据块]
                              ↑ 快照冻结，不会被覆盖
升级后:       指针树 B → [新数据块]

回滚 = 切回指针树 A，新数据块被释放
```

### 为什么 ext4 不行？

ext4 是**就地更新 (in-place update)** 文件系统。修改文件时直接覆盖磁盘上的原始数据块，旧数据被永久销毁。即使配合 LVM 快照，LVM 快照机制有严重的**性能衰减**问题（快照越大、存在时间越长，IO 性能越差），不适合生产环境。

## 文件系统选型

| 特性 | **Btrfs** | **ZFS** | ext4 |
| :--- | :--- | :--- | :--- |
| **原生快照** | ✅ 秒级 | ✅ 秒级 | ❌ 不支持 |
| **回滚能力** | ✅ 原子回滚 | ✅ 原子回滚 | ❌ 需要从备份恢复 |
| **数据校验** | ✅ CRC32C | ✅ SHA-256 / Fletcher4 | ❌ 无 |
| **内置压缩** | ✅ zstd / lzo | ✅ lz4 / zstd | ❌ 无 |
| **RAID** | 内置 RAID 0/1/10 | RAID-Z1/Z2/Z3 / Mirror | 依赖 mdraid |
| **推荐发行版** | openSUSE / Fedora / Ubuntu | Ubuntu / Proxmox | - |

### 各角色推荐

| 服务器角色 | 推荐 | 理由 |
| :--- | :--- | :--- |
| 数据库服务器 | **ZFS** | 数据校验更强，ZFS Send/Recv 便于灾备 |
| 应用 / Web 服务器 | **Btrfs** | 轻量易用，快照管理简单 |
| 容器宿主机 | **Btrfs** | Docker/Podman 原生支持 Btrfs 存储驱动 |
| NAS / 文件服务器 | **ZFS** | RAID-Z 数据保护能力更强 |
| 虚拟化宿主机 | **ZFS** | zvol 可直接作为虚拟磁盘 |

## 系统安装基线

### Btrfs 推荐布局

安装系统时按以下 subvolume 结构分区，使快照只覆盖系统区域，不影响日志和临时文件：

| Subvolume | 挂载点 | 说明 |
| :--- | :--- | :--- |
| `@` | `/` | 根文件系统，快照目标 |
| `@home` | `/home` | 用户数据，独立管理 |
| `@log` | `/var/log` | 日志独立，避免快照膨胀 |
| `@tmp` | `/tmp` | 临时文件，排除快照 |
| `@snapshots` | `/.snapshots` | 快照存储区 |

:::tip 推荐发行版
openSUSE 安装器默认即采用此布局并集成 `snapper` 快照管理工具，推荐作为服务器发行版。
:::

### ZFS 推荐布局

| Dataset | 说明 |
| :--- | :--- |
| `rpool/ROOT/ubuntu` | 根文件系统 |
| `rpool/ROOT/ubuntu/var` | 可变数据 |
| `rpool/home` | 用户数据 |
| `rpool/var/log` | 日志 |

关键配置参数：
- **ashift=12** — 对齐 4K 扇区
- **compression=zstd** — 启用压缩
- **atime=off** — 关闭访问时间记录，减少写入

## 升级回滚 SOP

### SOP 1：升级前 — 创建快照

| 步骤 | Btrfs 操作 | ZFS 操作 |
| :--- | :--- | :--- |
| 1. 确认文件系统类型 | `df -Th /` 确认 `btrfs` | `zpool status` 确认池状态 |
| 2. 检查空间 | `btrfs filesystem usage /` 确认剩余 >20% | `zfs list` 确认剩余 >20% |
| 3. 停止相关服务 | `systemctl stop <服务名>` | `systemctl stop <服务名>` |
| 4. 创建只读快照 | `btrfs subvolume snapshot -r / /.snapshots/pre-upgrade-<描述>-<日期>` | `zfs snapshot -r rpool@pre-upgrade-<描述>-<日期>` |
| 5. 确认快照存在 | `btrfs subvolume list /.snapshots` | `zfs list -t snapshot \| grep pre-upgrade` |
| 6. 记录快照名 | 写入变更工单 | 写入变更工单 |

:::note
ZFS 的 `-r` 参数表示**递归快照**，会自动为所有子 dataset 创建快照。Btrfs 需要对每个 subvolume 单独打快照，通常只需对根 `@` 打快照即可。
:::

### SOP 2：执行升级

1. 在变更窗口内执行升级操作（`apt upgrade` / `yum update` 等）
2. **不要重启**（除非升级项目明确要求重启，如内核升级）
3. 逐项验证升级结果（见下方各场景验证清单）

### SOP 3：升级失败 — 执行回滚

#### Btrfs 回滚步骤

1. 挂载 Btrfs 顶层卷：`mount -o subvolid=5 /dev/sdX /mnt`
2. 将当前根移走：`mv /mnt/@ /mnt/@_broken`
3. 从快照恢复：`btrfs subvolume snapshot /mnt/@snapshots/<快照名> /mnt/@`
4. 卸载并重启：`umount /mnt && reboot`

> 如果系统已无法操作（如 glibc 损坏），使用 **Live USB** 引导后执行上述步骤。

#### ZFS 回滚步骤

1. 执行回滚：`zfs rollback -r rpool/ROOT/ubuntu@<快照名>`
2. 重启：`reboot`

> ZFS 回滚更简单，一条命令即可。但注意 `-r` 会**销毁该快照之后创建的所有快照**。

### SOP 4：升级成功 — 收尾

1. 观察期运行 **48 小时**，确认无异常
2. 观察期结束后，清理快照：
   - Btrfs: `btrfs subvolume delete /.snapshots/<快照名>`
   - ZFS: `zfs destroy rpool@<快照名>`
3. 在工单中关闭变更记录

## 高风险升级场景指南

### 场景 1：数据库内核升级（PostgreSQL / MySQL）

| 阶段 | 操作 |
| :--- | :--- |
| **升级前** | ① 创建文件系统快照（SOP 1） |
|  | ② 额外做一次 `pg_dumpall` / `mysqldump` 逻辑备份（双保险） |
|  | ③ 停库 `systemctl stop postgresql` |
| **执行** | `apt install postgresql-<新版本>` |
| **验证** | ① 启动服务，检查版本 `SELECT version();` |
|  | ② 查询关键表行数，比对升级前记录 |
|  | ③ 检查复制状态（如有从库） |
| **失败回滚** | 执行 SOP 3，重启后数据库自动恢复到旧版本 |

### 场景 2：glibc 升级

:::warning glibc 升级风险极高
**glibc 是所有动态链接程序的基础。** 升级失败可能导致 `ls`、`ssh`、`systemctl` 等基本命令全部无法运行。**必须**在快照保护下操作。
:::

| 阶段 | 操作 |
| :--- | :--- |
| **升级前** | ① 创建文件系统快照（SOP 1） |
|  | ② 记录当前版本 `ldd --version` |
|  | ③ 准备好 Live USB 备用引导盘 |
| **执行** | `apt install libc6 libc-bin` |
| **验证** | ① `ldd --version` 确认新版本 |
|  | ② `python3 --version` / `ssh localhost` 测试动态链接程序 |
|  | ③ `systemctl status sshd` 确认关键服务正常 |
| **失败回滚** | 如能操作执行 SOP 3；如系统已瘫痪，从 Live USB 引导后执行 Btrfs/ZFS 回滚 |

### 场景 3：Linux 内核升级

| 阶段 | 操作 |
| :--- | :--- |
| **升级前** | ① 创建文件系统快照（SOP 1） |
| **执行** | `apt install linux-image-<新版本>` 后 `reboot` |
| **验证** | ① `uname -r` 确认新内核版本 |
|  | ② `dmesg \| grep -i error` 检查启动错误 |
|  | ③ 检查网络、存储、GPU 驱动是否正常加载 |
| **失败回滚** | 在 GRUB 菜单选择旧内核启动 → 回滚快照（SOP 3） |

## 快照日常管理

### 保留策略

| 快照类型 | 保留时间 | 说明 |
| :--- | :--- | :--- |
| 升级前快照 | 确认稳定后 48h 清理 | 最长保留 30 天 |
| 月度基线快照 | 6 个月 | 每月 1 日创建 |
| 年度归档快照 | 永久 | 每年 1 月 1 日创建 |

### 监控要点

纳入 Prometheus + Grafana 监控：

- **文件系统使用率 > 80%** → 告警（快照会增加空间占用）
- **快照数量 > 20** → 告警（防止堆积影响性能）
- **定期 scrub** → 每月执行一次数据完整性校验
  - Btrfs: `btrfs scrub start /`
  - ZFS: `zpool scrub rpool`

## 变更检查清单

运维人员执行高风险升级前，逐项确认：

- [ ] 变更已获审批（核心系统需 CTO 签字）
- [ ] 在维护窗口内操作（每周四 20:00-24:00）
- [ ] 确认文件系统为 Btrfs 或 ZFS
- [ ] 已创建快照并确认快照存在
- [ ] 已确认回滚步骤（SOP 3）可执行
- [ ] 数据库升级已额外做逻辑备份
- [ ] 已通知相关业务方
- [ ] glibc 升级已准备 Live USB 备用引导盘
- [ ] 变更记录已录入工单系统
