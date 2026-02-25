---
sidebar_position: 3
---

# 目标文件与特征

本节详细列出加密资产的存储位置、文件特征和搜索模式，帮助取证人员精准定位目标数据。

## 1. 钱包文件位置大全

### 1.1 Bitcoin Core (Bitcoin-Qt)

官方全节点钱包，存储格式为 Berkeley DB。

| 平台 | 存储路径 | 文件 |
| :--- | :--- | :--- |
| **Windows** | `%APPDATA%\Bitcoin\` | `wallet.dat` |
| | `%APPDATA%\Bitcoin\wallets\` | 多钱包目录 |
| **macOS** | `~/Library/Application Support/Bitcoin/` | `wallet.dat` |
| | `~/Library/Application Support/Bitcoin/wallets/` | 多钱包目录 |
| **Linux** | `~/.bitcoin/` | `wallet.dat` |
| | `~/.bitcoin/wallets/` | 多钱包目录 |

**特征识别**:
- 文件签名: `00 00 00 62 31 05 00 09` (Berkeley DB)
- 文件大小: 通常数百 KB 到数 MB
- 关键数据: 私钥、交易记录、地址簿

**备份文件**:
```bash
# 常见备份位置
rg -i "wallet.*backup|bitcoin.*backup" /mnt/evidence/
rg -i "\.bak|\.backup|\.old" /mnt/evidence/ --type dat
```

### 1.2 Electrum 钱包

轻量级 Bitcoin 钱包，支持多种加密级别。

| 平台 | 存储路径 |
| :--- | :--- |
| **Windows** | `%APPDATA%\Electrum\wallets\` |
| **macOS** | `~/.electrum/wallets/` |
| **Linux** | `~/.electrum/wallets/` |

**文件特征**:
- 默认文件名: `default_wallet`
- 自定义文件名: 用户定义，无扩展名
- 格式: JSON 或 AES 加密

**内容特征**:
```json
// 未加密钱包示例
{
  "addr_history": {...},
  "addresses": {...},
  "keystore": {
    "seed": "silver dwarf hungry...",
    "type": "bip32"
  }
}
```

### 1.3 Ethereum 钱包

#### Geth (Go-Ethereum)

| 平台 | 存储路径 | 文件模式 |
| :--- | :--- | :--- |
| **Windows** | `%APPDATA%\Ethereum\keystore\` | `UTC--<时间戳>--<地址>` |
| **macOS** | `~/Library/Ethereum/keystore/` | `UTC--*` |
| **Linux** | `~/.ethereum/keystore/` | `UTC--*` |

**Keystore 文件格式**:
```json
{
  "version": 3,
  "id": "uuid-string",
  "address": "0x1234...",
  "crypto": {
    "ciphertext": "encrypted_private_key",
    "cipherparams": {...},
    "cipher": "aes-128-ctr",
    "kdf": "scrypt",
    "kdfparams": {...},
    "mac": "checksum"
  }
}
```

**搜索模式**:
```bash
# 搜索 Keystore 文件
find /mnt/evidence/ -name "UTC--*" -type f

# 搜索包含 keystore 内容的文件
rg '"crypto".*"ciphertext".*"kdf"' /mnt/evidence/

# 搜索以太坊地址格式
rg '0x[0-9a-fA-F]{40}' /mnt/evidence/
```

#### MetaMask

浏览器扩展，数据存储在浏览器配置目录。

| 浏览器 | 存储位置 |
| :--- | :--- |
| Chrome | `~/.config/google-chrome/Default/Local Extension Settings/nkbihfbeog...` |
| Firefox | `~/.mozilla/firefox/<profile>/storage/default/moz-extension+++...` |
| Edge | `~/.config/microsoft-edge/Default/Local Extension Settings/...` |

**存储格式**: LevelDB 或 Extension Storage
**提取方法**: 需专业工具解密，或从浏览器导出。

### 1.4 硬件钱包配套软件

#### Ledger Live

| 平台 | 存储路径 | 内容 |
| :--- | :--- | :--- |
| **Windows** | `%APPDATA%\Ledger Live\` | 账户元数据 |
| **macOS** | `~/Library/Application Support/Ledger Live/` | 交易历史 |
| **Linux** | `~/.config/Ledger Live/` | 应用配置 |

**注意**: 私钥始终存储在硬件设备内，软件仅保存元数据。

#### Trezor Suite

| 平台 | 存储路径 |
| :--- | :--- |
| **Windows** | `%APPDATA%\@trezor\suite-desktop\` |
| **macOS** | `~/Library/Application Support/@trezor/suite-desktop/` |
| **Linux** | `~/.config/@trezor/suite-desktop/` |

### 1.5 其他主流钱包

| 钱包 | 路径特征 | 文件类型 |
| :--- | :--- | :--- |
| **Exodus** | `~/Exodus/` | `.json`, `.exodus` |
| **Atomic** | `~/Atomic/` | SQLite |
| **Jaxx** | `~/Library/Jaxx/` (macOS) | JSON |
| **Coinomi** | Android `/data/data/com.coinomi.wallet/` | SQLite |
| **Trust Wallet** | 手机应用数据 | Keychain/Keystore |
| **TokenPocket** | 应用沙盒 | 加密存储 |

## 2. 助记词 (Seed Phrase) 搜索模式

### 2.1 BIP-39 标准

助记词遵循 BIP-39 标准，从 2048 个单词的词表中选择。

**标准长度**:
- 12 词 (128 位熵) - 最常见
- 15 词 (160 位熵)
- 18 词 (192 位熵)
- 21 词 (224 位熵)
- 24 词 (256 位熵) - 最高安全级别

**词表语言**:
- 英语 (默认)
- 中文简体/繁体
- 日语
- 韩语
- 西班牙语
- 法语
- 意大利语

### 2.2 搜索正则模式

#### 基础模式 (前 50 个高频词)

```bash
# 英文助记词搜索 (常用词开头)
BIP39_WORDS="abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all"

rg -i "\b($BIP39_WORDS)\b" /mnt/evidence/ --type txt --type md
```

#### 连续助记词模式

```bash
# 12 个连续单词 (每个 3-8 字母)
# 这是一个粗略匹配，可能有误报
rg -i '\b([a-z]{3,8}\s+){11}[a-z]{3,8}\b' /mnt/evidence/ --type txt

# 更精确的模式 (12 词)
rg -i '\b([a-z]+\s+){11}[a-z]+\b' /mnt/evidence/ --type txt | \
   rg -i '\b(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act)\b'
```

#### 中文助记词搜索

```bash
# 中文助记词通常为汉字，以空格分隔
# 如: 的 一 是 在 不 了 有 和 人 这 中 大

# 搜索中文文本文件
rg -C 3 '[\u4e00-\u9fff]\s+[\u4e00-\u9fff]\s+[\u4e00-\u9fff]' /mnt/evidence/ --type txt
```

### 2.3 存储形式识别

| 存储形式 | 文件扩展名 | 搜索策略 |
| :--- | :--- | :--- |
| **纯文本** | `.txt`, `.md`, `.note` | 直接 ripgrep 搜索 |
| **截图/照片** | `.png`, `.jpg`, `.heic` | OCR (tesseract) |
| **Office 文档** | `.docx`, `.xlsx`, `.pptx` | 解压后搜索 XML |
| **PDF** | `.pdf` | `pdftotext` 后搜索 |
| **加密文档** | `.zip`, `.7z`, `.dmg` | 先解压再搜索 |
| **便签应用** | 应用数据库 | 导出 SQLite |
| **浏览器书签** | `Bookmarks` | 解析 JSON |

### 2.4 OCR 识别流程

对于截图类助记词备份：

```bash
# 1. 安装 OCR 工具
sudo apt install tesseract-ocr tesseract-ocr-eng tesseract-ocr-chi-sim

# 2. 批量 OCR 图片
for img in /mnt/evidence/Pictures/*.png /mnt/evidence/Pictures/*.jpg; do
    echo "=== Processing: $img ===" >> /forensics/ocr_results.txt
    tesseract "$img" stdout >> /forensics/ocr_results.txt 2>/dev/null
    echo "" >> /forensics/ocr_results.txt
done

# 3. 在 OCR 结果中搜索助记词
rg -i '\b(abandon|ability|able|about|above)\b' /forensics/ocr_results.txt
```

## 3. 私钥搜索模式

### 3.1 十六进制私钥

```bash
# 比特币/以太坊私钥 (64 位十六进制)
rg -i '\b[0-9a-fA-F]{64}\b' /mnt/evidence/

# 带 0x 前缀 (以太坊常见)
rg -i '\b0x[0-9a-fA-F]{64}\b' /mnt/evidence/

# WIF 格式私钥 (Wallet Import Format)
# 以 5、K 或 L 开头，51 字符
rg -i '\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b' /mnt/evidence/
```

### 3.2 其他密钥格式

| 类型 | 格式特征 | 正则表达式 |
| :--- | :--- | :--- |
| **WIF (压缩)** | 以 K/L 开头 | `^K[1-9A-HJ-NP-Za-km-z]{51}$` |
| **WIF (未压缩)** | 以 5 开头 | `^5[1-9A-HJ-NP-Za-km-z]{50}$` |
| **Extended Key** | xprv/xpub | `^x(prv|pub)[1-9A-HJ-NP-Za-km-z]{107,111}$` |
| **BIP38 加密** | 6P 开头 | `^6P[1-9A-HJ-NP-Za-km-z]{56}$` |

## 4. 配置文件与缓存

### 4.1 浏览器相关

```bash
# Chrome 扩展存储 (MetaMask 等)
/mnt/evidence/Users/*/AppData/Local/Google/Chrome/User Data/Default/Local Extension Settings/

# Firefox 配置
/mnt/evidence/Users/*/AppData/Roaming/Mozilla/Firefox/Profiles/*/storage/

# Safari (macOS)
~/Library/Safari/
```

### 4.2 系统缓存

```bash
# Windows 剪贴板历史 (可能包含复制的私钥)
/mnt/evidence/Users/*/AppData/Local/Microsoft/Windows/Clipboard/

# 最近文档
/mnt/evidence/Users/*/AppData/Roaming/Microsoft/Windows/Recent/

# 缩略图缓存 (可能包含钱包截图)
/mnt/evidence/Users/*/AppData/Local/Microsoft/Windows/Explorer/thumbcache_*.db
```

## 5. 云同步文件夹

员工可能在云同步文件夹中备份钱包文件：

| 服务 | Windows 路径 | macOS 路径 |
| :--- | :--- | :--- |
| **Dropbox** | `~/Dropbox/` | `~/Dropbox/` |
| **Google Drive** | `~/Google Drive/` | `~/Google Drive/` |
| **OneDrive** | `~/OneDrive/` | `~/OneDrive/` |
| **iCloud** | N/A | `~/Library/Mobile Documents/` |
| **百度网盘** | `~/BaiduSyncdisk/` | `~/BaiduSyncdisk/` |

**搜索策略**:
```bash
# 搜索云同步目录
rg -i "wallet|bitcoin|ethereum|crypto|seed|mnemonic" \
   /mnt/evidence/Dropbox/ \
   /mnt/evidence/Google\ Drive/ \
   /mnt/evidence/OneDrive/ 2>/dev/null
```

## 6. 交易所与 DeFi 相关

### 6.1 API 密钥

```bash
# 搜索 API Key 模式
rg -i 'api[_-]?key.*[=:]\s*[a-zA-Z0-9]{20,}' /mnt/evidence/
rg -i 'api[_-]?secret.*[=:]\s*[a-zA-Z0-9]{20,}' /mnt/evidence/

# 常见交易所 API 格式
rg -i 'binance|coinbase|kraken|okx|bybit|kucoin|huobi' /mnt/evidence/ --type txt
```

### 6.2 2FA 备份

```bash
# TOTP 备份 (Google Authenticator, Authy 等)
rg 'otpauth://totp/' /mnt/evidence/
rg 'secret=[A-Z2-7]{16,}' /mnt/evidence/

# 恢复码
rg -i 'recovery.*code|backup.*code|2fa.*code' /mnt/evidence/
```

## 7. 自动化扫描脚本

```bash
#!/bin/bash
# crypto-asset-scanner.sh
# 自动化加密资产扫描脚本

TARGET_DIR="${1:-/mnt/evidence}"
OUTPUT_DIR="${2:-/forensics/scan_results}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$OUTPUT_DIR/scan_report_$TIMESTAMP.txt"

mkdir -p "$OUTPUT_DIR"

echo "=== 加密资产取证扫描报告 ===" > "$REPORT_FILE"
echo "扫描时间: $(date)" >> "$REPORT_FILE"
echo "目标目录: $TARGET_DIR" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. 搜索钱包文件
echo "[1/6] 搜索钱包文件..." >> "$REPORT_FILE"
find "$TARGET_DIR" -type f \( \
    -name "wallet.dat" -o \
    -name "UTC--*" -o \
    -name "*wallet*" -o \
    -name "*keystore*" -o \
    -name "*mnemonic*" -o \
    -name "*seed*" \
) 2>/dev/null >> "$REPORT_FILE"

# 2. 搜索助记词
echo "" >> "$REPORT_FILE"
echo "[2/6] 搜索助记词模式..." >> "$REPORT_FILE"
BIP39_TOP50="abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all"
rg -i "\b($BIP39_TOP50)\b" "$TARGET_DIR" --type txt 2>/dev/null | head -20 >> "$REPORT_FILE"

# 3. 搜索私钥
echo "" >> "$REPORT_FILE"
echo "[3/6] 搜索私钥模式..." >> "$REPORT_FILE"
rg -i '\b[0-9a-fA-F]{64}\b' "$TARGET_DIR" --type txt 2>/dev/null | head -10 >> "$REPORT_FILE"

# 4. 搜索 API 密钥
echo "" >> "$REPORT_FILE"
echo "[4/6] 搜索 API 密钥..." >> "$REPORT_FILE"
rg -i 'api[_-]?(key|secret)' "$TARGET_DIR" --type txt 2>/dev/null | head -10 >> "$REPORT_FILE"

# 5. 搜索加密相关文件
echo "" >> "$REPORT_FILE"
echo "[5/6] 搜索加密相关文件..." >> "$REPORT_FILE"
rg -i 'bitcoin|ethereum|crypto|blockchain|wallet|private.*key' \
    "$TARGET_DIR" --type txt 2>/dev/null | wc -l | \
    xargs -I {} echo "找到 {} 个匹配文件" >> "$REPORT_FILE"

# 6. 图片元数据
echo "" >> "$REPORT_FILE"
echo "[6/6] 分析图片元数据..." >> "$REPORT_FILE"
if command -v exiftool >/dev/null 2>&1; then
    exiftool -r -if '$FileType eq "PNG" or $FileType eq "JPEG"' \
        -p '$FileName: $ImageSize - $FileModifyDate' \
        "$TARGET_DIR" 2>/dev/null | head -20 >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "=== 扫描完成 ===" >> "$REPORT_FILE"
echo "完整报告: $REPORT_FILE"
```

---

**下一步**: [取证操作流程](./forensics-sop) - 了解完整的操作步骤
