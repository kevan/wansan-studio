const crypto = require('crypto')

/**
 * 核心配置 - 这里的 SALT 必须与你 App 代码中解密逻辑的 SALT 一致
 * 建议在代码中将此 SALT 拆分成段存储
 */
const MASTER_SALT = 'wansan-studio-2025-special-security-salt' // 示例盐值

function encrypt(text) {
  // 生成 32 字节的 Key (基于 SALT 和 PBKDF2 增加破解难度)
  const key = crypto.pbkdf2Sync(
    MASTER_SALT,
    'salt-pepper',
    100000,
    32,
    'sha256'
  )
  const iv = crypto.randomBytes(12) // GCM 推荐使用 12 字节 IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag().toString('base64')

  // 输出格式: iv:authTag:encryptedData
  return `${iv.toString('base64')}:${authTag}:${encrypted}`
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: node obfuscate-tool.js <YOUR_API_KEY>')
  process.exit(1)
}

const plainKey = args[0]
const obfuscated = encrypt(plainKey)

console.log('\n--- GENERATED OBFUSCATED STRING ---')
console.log(obfuscated)
console.log(
  '--- COPY THE STRING ABOVE TO GITHUB SECRETS (SPECIAL_CHANNEL_OBFUSCATED_KEY) ---\n'
)
