---
sidebar_position: 2
---

# 取证工作站工具栈

> **部署建议**: 基于 Ubuntu 22.04 LTS 搭建专用取证工作站，或使用 [Tsurugi Linux](https://tsurugi-linux.org/) 等专业取证发行版。

## 工具分类总览

| 类别 | 工具 | 用途 |
| :--- | :--- | :--- |
| **磁盘成像** | ddrescue, smartmontools, hdparm | 创建法证镜像、检查硬盘健康 |
| **文件系统** | ntfs-3g, util-linux, coreutils | 挂载分区、基础工具 |
| **取证分析** | sleuthkit, autopsy, testdisk | 文件系统分析、深度恢复 |
| **搜索识别** | ripgrep, p7zip, exiftool, file | 模式匹配、元数据提取 |

## 1. 磁盘成像工具

### 1.1 ddrescue - 数据拯救专家

**用途**: 从损坏硬盘创建位对位镜像，具备智能重试和日志功能。

**安装**:
```bash
sudo apt install gddrescue
```

**核心命令**:
```bash
# 第一阶段：快速读取，跳过损坏扇区
ddrescue -n /dev/sdb /forensics/disk.img /forensics/mapfile.log

# 第二阶段：深度恢复损坏区域
ddrescue -d -r3 /dev/sdb /forensics/disk.img /forensics/mapfile.log

# 查看恢复进度
cat /forensics/mapfile.log
```

**关键参数**:
| 参数 | 说明 |
| :--- | :--- |
| `-n` | 跳过扫描，快速第一遍 |
| `-d` | 直接磁盘访问模式 |
| `-r3` | 失败扇区重试3次 |
| `-v` | 详细输出 |

### 1.2 smartmontools - 硬盘健康监测

**用途**: 读取 S.M.A.R.T. 数据，评估硬盘健康状态。

**安装**:
```bash
sudo apt install smartmontools
```

**核心命令**:
```bash
# 查看完整 S.M.A.R.T. 报告
sudo smartctl -a /dev/sdb

# 快速健康评估
sudo smartctl -H /dev/sdb

# 运行短期自检 (2分钟)
sudo smartctl -t short /dev/sdb

# 运行完整自检 (可能需要数小时)
sudo smartctl -t long /dev/sdb

# 查看自检结果
sudo smartctl -l selftest /dev/sdb
```

**关键指标解读**:
| 属性 | 正常值 | 警告阈值 |
| :--- | :--- | :--- |
| Reallocated_Sector_Ct | 0 | > 10 |
| Current_Pending_Sector | 0 | > 0 |
| Offline_Uncorrectable | 0 | > 0 |
| Temperature_Celsius | < 50°C | > 55°C |

### 1.3 hdparm - 硬盘参数管理

**用途**: 设置 ATA 安全密码、电源管理、性能测试。

**安装**:
```bash
sudo apt install hdparm
```

**核心命令**:
```bash
# 查看硬盘信息
sudo hdparm -I /dev/sdb

# 启用安全冻结 (防止恶意修改)
sudo hdparm --security-freeze /dev/sdb

# 检查只读锁状态
sudo hdparm -r /dev/sdb

# 性能测试 (缓存读取)
sudo hdparm -t /dev/sdb

# 性能测试 (缓存+磁盘)
sudo hdparm -T /dev/sdb
```

## 2. 文件系统工具

### 2.1 ntfs-3g - NTFS 只读挂载

**用途**: 安全挂载 Windows NTFS 分区，取证时必须使用只读模式。

**安装**:
```bash
sudo apt install ntfs-3g
```

**核心命令**:
```bash
# 列出 NTFS 分区
sudo fdisk -l | grep -i ntfs

# 只读挂载 NTFS 分区
sudo mount -t ntfs-3g -o ro,loop /dev/sdb1 /mnt/evidence

# 禁用休眠文件解析 (Windows 快速启动兼容性)
sudo mount -t ntfs-3g -o ro,remove_hiberfile /dev/sdb1 /mnt/evidence

# 查看挂载选项
mount | grep ntfs
```

**重要**: 永远使用 `-o ro` (只读) 选项，避免意外修改证据。

### 2.2 util-linux - 基础磁盘工具

**用途**: `blkid`, `lsblk`, `fdisk` 等基础命令，通常系统自带。

**核心命令**:
```bash
# 列出所有块设备
lsblk -f

# 识别文件系统类型和 UUID
sudo blkid /dev/sdb1

# 查看分区表
sudo fdisk -l /dev/sdb

# 查看 GPT 分区表
sudo gdisk -l /dev/sdb
```

### 2.3 coreutils - 基础命令

**用途**: `dd`, `shred` 等基础命令，系统自带。

**核心命令**:
```bash
# 创建磁盘镜像 (简单版，不如 ddrescue 智能)
sudo dd if=/dev/sdb of=/forensics/disk.img bs=4M status=progress

# 安全擦除文件 (覆写 3 次 + 零填充)
shred -vfz -n 3 sensitive_file.txt

# 安全擦除整盘 (危险操作！确认后执行)
# sudo dd if=/dev/urandom of=/dev/sdb bs=4M status=progress
```

## 3. 取证分析工具

### 3.1 Sleuth Kit (TSK) - 命令行取证

**用途**: 文件系统级别取证分析，支持多种文件系统。

**安装**:
```bash
sudo apt install sleuthkit
```

**核心工具**:

| 工具 | 用途 | 示例 |
| :--- | :--- | :--- |
| `fls` | 列出文件和目录 | `fls -r disk.img` |
| `icat` | 提取文件内容 | `icat disk.img 1234 > file.txt` |
| `ils` | 列出 inode 信息 | `ils -r disk.img` |
| `fsstat` | 显示文件系统信息 | `fsstat disk.img` |
| `tsk_recover` | 恢复已删除文件 | `tsk_recover -r disk.img /output/` |
| `blkcat` | 提取原始块数据 | `blkcat disk.img 1234` |
| `jcat` | 提取日志数据 | `jcat disk.img 1` |

**实战示例**:
```bash
# 1. 查看文件系统类型
fsstat /forensics/disk.img

# 2. 递归列出所有文件 (包括已删除)
fls -r -p /forensics/disk.img | tee file_list.txt

# 3. 搜索特定文件名
fls -r /forensics/disk.img | grep -i wallet

# 4. 恢复所有已删除文件
sudo mkdir -p /forensics/recovered
tsk_recover -r /forensics/disk.img /forensics/recovered/

# 5. 提取特定文件 (需要先获取 inode 号)
fls /forensics/disk.img  # 找到 inode
icat /forensics/disk.img 12345 > recovered_file.dat
```

### 3.2 Autopsy - 图形化取证平台

**用途**: 基于 Sleuth Kit 的图形界面，支持案件管理、时间线分析、关键词搜索。

**安装**:
```bash
sudo apt install autopsy
```

**启动**:
```bash
# 必须以 root 运行
sudo autopsy

# 默认访问 http://localhost:9999/autopsy
```

**使用流程**:
1. 创建新案件 (Case) → 输入案件名称和描述
2. 添加主机 (Host) → 添加证据源
3. 添加数据源 (Data Source) → 选择磁盘镜像
4. 运行摄入模块 (Ingest Modules):
   - 最近活动分析
   - 文件类型识别
   - EXIF 提取
   - 关键词搜索 (可导入 BIP-39 词汇表)
5. 使用时间线视图查看文件活动
6. 导出发现的证据

### 3.3 TestDisk - 分区恢复

**用途**: 修复分区表、恢复丢失的分区。

**安装**:
```bash
sudo apt install testdisk
```

**核心功能**:
```bash
# 交互式分区恢复
sudo testdisk /dev/sdb

# 快速搜索步骤:
# 1. 选择磁盘
# 2. 选择分区表类型 (Intel/EFI GPT)
# 3. 选择 [Analyse] 分析当前分区结构
# 4. 选择 [Quick Search] 快速搜索
# 5. 查看找到的分区，按 P 预览文件
# 6. 确认后选择 [Write] 写入修复
```

**PhotoRec 文件雕刻** (TestDisk 自带):
```bash
# 交互式文件恢复
sudo photorec /forensics/disk.img

# PhotoRec 恢复特点:
# - 无需文件系统，直接扫描磁盘块
# - 基于文件签名识别类型
# - 恢复的文件丢失原始文件名
# - 按类型自动分类到 recup_dir.* 目录
```

## 4. 搜索与识别工具

### 4.1 ripgrep (rg) - 高速搜索

**用途**: 使用正则表达式快速搜索文件内容，特别适合模式匹配助记词、私钥。

**安装**:
```bash
sudo apt install ripgrep
```

**核心命令**:
```bash
# 基础搜索
rg "bitcoin" /mnt/evidence/

# 搜索特定文件类型
rg -t txt -t md "wallet" /mnt/evidence/

# 使用正则表达式搜索私钥格式 (64位十六进制)
rg -i '[0-9a-fA-F]{64}' /mnt/evidence/

# 搜索 BIP-39 助记词 (前几个高频词示例)
rg -i '\b(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act)\b' \
   /mnt/evidence/ --type txt

# 连续 12 词模式 (粗略匹配)
rg -i '([a-z]{3,8}\s+){11}[a-z]{3,8}' /mnt/evidence/

# 搜索钱包文件名
rg -i "wallet\.dat|keystore|mnemonic|seed" /mnt/evidence/

# 排除二进制文件
rg -I --type-not binary "password" /mnt/evidence/
```

**性能优势**: ripgrep 比传统 grep 快 3-5 倍，支持多线程和自动跳过二进制文件。

### 4.2 p7zip - 压缩包处理

**用途**: 解压多种格式压缩包，包括加密压缩包。

**安装**:
```bash
sudo apt install p7zip-full
```

**核心命令**:
```bash
# 解压 7z 格式
7z x archive.7z -o/output/

# 解压带密码的压缩包
7z x encrypted.7z -p

# 测试压缩包完整性
7z t archive.7z

# 列出压缩包内容
7z l archive.7z

# 解压 RAR (需安装 p7zip-rar)
sudo apt install p7zip-rar
7z x archive.rar
```

### 4.3 exiftool - 元数据提取

**用途**: 提取图片、文档等文件的 EXIF 元数据，可能包含创建时间、设备信息、GPS 坐标等。

**安装**:
```bash
sudo apt install libimage-exiftool-perl
```

**核心命令**:
```bash
# 查看单个文件完整元数据
exiftool photo.jpg

# 递归提取目录中所有图片元数据
exiftool -r /mnt/evidence/Pictures/ > metadata.txt

# 搜索包含 GPS 坐标的图片
exiftool -r -if '$GPSLatitude' /mnt/evidence/

# 提取创建时间并排序
exiftool -r -p '$FileName, $CreateDate' -d '%Y-%m-%d %H:%M:%S' \
   /mnt/evidence/Pictures/ | sort -t, -k2

# 查找截图类图片 (可能包含助记词)
exiftool -r -if '$Software =~ /Screenshot|Snipping|Grab/' \
   /mnt/evidence/Pictures/
```

### 4.4 file - 文件类型识别

**用途**: 通过文件签名(魔数)识别真实文件类型，即使扩展名被修改。

**核心命令**:
```bash
# 识别单个文件
file suspicious_file.dat

# 批量识别目录中所有文件
file -r /mnt/evidence/recovered/

# 显示 MIME 类型
file -i /mnt/evidence/unknown_file

# 从文件内容识别 (不从扩展名)
file --extension-off /mnt/evidence/wallet.txt

# 结合 find 批量识别
find /mnt/evidence/ -type f -exec file {} \; > file_types.txt
```

### 4.5 unzip - ZIP 处理

**用途**: 解压 ZIP 格式文件。

**核心命令**:
```bash
# 列出 ZIP 内容
unzip -l archive.zip

# 解压到指定目录
unzip archive.zip -d /output/

# 解压带密码的 ZIP
unzip -P password123 encrypted.zip

# 解压时覆盖不提示
unzip -o archive.zip -d /output/

# 测试 ZIP 完整性
unzip -t archive.zip
```

## 5. 一键安装脚本

```bash
#!/bin/bash
# crypto-forensics-toolkit-install.sh
# 取证工作站工具包一键安装

set -e

echo "=== 加密资产取证工具包安装 ==="

# 更新包列表
sudo apt update

# 安装工具
sudo apt install -y \
  gddrescue \
  smartmontools \
  hdparm \
  ntfs-3g \
  sleuthkit \
  autopsy \
  testdisk \
  ripgrep \
  p7zip-full \
  p7zip-rar \
  unzip \
  libimage-exiftool-perl \
  tesseract-ocr \
  tesseract-ocr-eng

echo ""
echo "=== 安装完成 ==="
echo "已安装工具:"
echo "  - 磁盘成像: ddrescue, smartmontools, hdparm"
echo "  - 文件系统: ntfs-3g, util-linux, coreutils"
echo "  - 取证分析: sleuthkit, autopsy, testdisk"
echo "  - 搜索识别: ripgrep, p7zip, unzip, exiftool, file"
echo "  - OCR 识别: tesseract-ocr"
echo ""
echo "建议：创建证据存储目录:"
echo "  sudo mkdir -p /forensics/cases"
echo "  sudo chown \$USER:\$USER /forensics/cases"
```

## 6. 工具选择速查

| 任务 | 首选工具 | 备选工具 |
| :--- | :--- | :--- |
| 损坏硬盘镜像 | ddrescue | dd |
| 硬盘健康检查 | smartctl | - |
| 分区表修复 | testdisk | - |
| 已删除文件恢复 | tsk_recover | photorec |
| 文件系统分析 | fls, fsstat | autopsy GUI |
| 图形化分析 | autopsy | - |
| 文本内容搜索 | ripgrep | grep |
| 压缩包解压 | p7zip | unzip |
| 图片元数据 | exiftool | - |
| 文件类型识别 | file | - |
| 助记词 OCR | tesseract | - |

---

**下一步**: [目标文件与特征](./02-target-patterns) - 了解要查找什么
