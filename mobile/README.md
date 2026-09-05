# 食衡 Shíhéng Mobile MVP

面向澳洲多元文化饮食场景的中英双语营养记录原型。项目使用 Expo SDK 57、React Native、TypeScript 和 Expo Router，一套代码支持 iOS、Android 与 Web。

> 当前版本用于验证产品流程。内置营养数据是开发样例，不应被用于临床判断、疾病管理或正式营养分析。

## 已完成的MVP流程

- 今日仪表盘：能量、蛋白质、膳食纤维和钠进度
- 中英文食品搜索与分类筛选
- 澳洲常见食品、中餐/混合餐随包底库、FSANZ AUSNUT/AFCD 官方库、USDA 海外对照、一小批超市包装摘录，以及个人图鉴（记过即可离线再查）
- 份量调整、餐次选择和本地记录
- 按早餐、午餐、晚餐、加餐查看日志
- 基于一般健康目标的下一餐搭配提示
- 数据来源、地区和可信等级展示
- 目标预设、本地持久化与数据清除
- 自定义食品、食品收藏与复制记录
- 首次使用说明、隐私说明和本地反馈控制
- 仅统计动作次数的本地测试指标
- 安卓正式包自动更新（EAS Update）与卸载彻底清除（关闭系统备份）
- 顶层错误边界和无额外依赖的领域测试
- 明确的一般健康/非医疗用途边界

## 开始运行

环境要求：Node.js LTS、pnpm，以及手机上的兼容 Expo Go 或本地开发构建。

```powershell
cd mobile
pnpm install
pnpm start
```

常用命令：

```powershell
pnpm run typecheck       # TypeScript检查
pnpm run test:domain     # 营养计算、建议、输入与目录质量检查
pnpm run web             # 启动Web开发版
pnpm run android         # 需要Android Studio或已连接设备
pnpm run ios             # iOS本机构建需要macOS/Xcode
pnpm run export:web      # 生产Web导出到dist目录
```

SDK 57通常需要与其匹配的Expo Go或development build。若应用商店中的Expo Go仍停留在SDK 54，请使用开发构建或另行建立SDK 54兼容分支。

Web 静态托管需支持 clean URL 或将 `/log`、`/search`、`/profile`、`/food/*` 等路径映射到对应的 `.html` 文件。仅用不带路由回退的通用文件服务器时，应用内跳转可用，但直接刷新子路径会返回404；部署到正式托管平台时应配置相应重写规则。

## 目录结构

```text
src/
  app/                   Expo Router页面
    (tabs)/              今天、搜索、日志、我的
    food/[id].tsx         食物详情与添加流程
  components/            通用卡片、按钮、进度条、食物行
  constants/theme.ts     视觉设计令牌
  data/generated/        FSANZ AUSNUT/AFCD 与 USDA Foundation 导入结果
  domain/nutrition.ts    纯营养计算和建议逻辑
  store/                 本地状态与AsyncStorage持久化
  types/                 领域模型
```

## 数据模型与原则

每条食品记录包含：

- 中英文名称和别名
- 默认份量及克重
- 每100克核心营养素
- 来源类型、地区、可信等级和更新时间
- 食品类别与标签
- 包装食品可选条码、品牌、有售超市（Woolworths / Coles）

正式数据接入顺序建议：

1. 已导入 FSANZ Australian Food Composition Database Release 3 与 AUSNUT 2023（须按 Data User Licence 署名、ShareAlike，并显示局限性声明）。
2. 已加入 USDA FoodData Central Foundation Foods 作为美国对照（CC0），不替代澳洲值。
3. 核查许可后可继续加入 AUSNUT 复合食物映射细化与 FSANZ 品牌库。
4. 为中餐和亚洲餐建立经APD审核的配方区间。
5. 最后加入标签OCR、条码和用户提交审核工作流。

重新从官方 Excel/JSON 生成目录：

```powershell
cd mobile
python scripts/import-official-catalog.py
```

不要把当前 `foods.ts` 中的样例值直接迁移到生产数据库。

## 安卓封闭测试安装包

包名为 `au.shiheng.app`。记录、反馈和指标只写在应用沙箱（AsyncStorage），没有外部目录。本机可打出可直接安装的签名 APK（不经过应用商店）：

```powershell
cd mobile
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/build-android-apk.mjs
```

生成文件：`mobile/release/shiheng-1.0.0-closed-trial.apk`。上传密钥在 `mobile/credentials/`（已 gitignore），覆盖安装必须使用同一把密钥。

在安卓手机上：把 APK 拷到手机 → 允许该文件管理器安装未知应用 → 打开安装。流程包含引导、搜索、记餐、日志、自定义食品、隐私、反馈和本机清除。卸载会删除沙箱数据，且已关闭系统备份。

**自动更新**仍走 Expo 官方 `expo-updates` + EAS Update。当前未登录 Expo 时，安装包可独立使用，但不会拉取远程更新。登录后：

```powershell
npx eas-cli login
npx eas-cli init
npx eas-cli update:configure
npx eas-cli build -p android --profile preview
```

Expo Go 和网页不会拉取该更新。改原生依赖或升 `version`（`appVersion` 策略）后需要重新出安卓包。

**卸载清除**：`android.allowBackup` 为 false，并写入排除云备份/换机传送的 data extraction rules，同时 `hasFragileUserData=false`，避免卸载时保留应用数据。卸载后饮食记录、自定义食品、图鉴核对、引导标记、反馈和本地指标都会随沙箱删除，重装不会被 Google 备份还原。

## 后续开发优先级

### P0：验证前必须完成

- 抽样核验已导入的 FSANZ AUSNUT/AFCD 条目，并核对中餐配方估算
- 增加常吃餐食和更快的份量确认
- 扩充状态迁移、边界条件和交互测试
- 完成Android与iPhone真机测试矩阵
- 准备封闭测试任务脚本和安装包

### P1：验证差异化

- 澳洲条码扫描和营养标签OCR
- 照片、语音与文字联合输入
- 中餐用油、酱汁和合菜份量快速确认
- Apple Health与Health Connect
- 可导出的营养师周报

### P2：产品市场匹配之后

- Supabase/PostgreSQL云同步和账号系统
- APD专业端与机构工作区
- 付费订阅、家庭账户和高级计划
- 多语言及其他亚洲饮食扩展

## 合规提醒

- 不爬取 Woolworths 或 Coles 内部商品库。当前超市包装层是 Open Food Facts 社区标签摘录（ODbL），用于验证条码/品牌搜索，不是零售商官方仓库或代言。
- FSANZ 数据按 CC BY-SA 3.0 Australia / Data User Licence 使用；USDA Foundation 为 CC0 对照。不得把美国数据标成澳洲官方值，也不得暗示 FSANZ 背书。
- 不提供疾病诊断、治疗、临床监测或基于化验结果的自动治疗建议。
- 接入云端或境外AI服务前完成澳洲隐私影响评估和跨境数据审查。
- 孕期、儿童、进食障碍、肾病、糖尿病及过敏等场景需专业转介与单独安全设计。

## 当前技术决策

- **Expo Router**：文件路由同时支持原生与Web。
- **AsyncStorage**：验证期只在本机保存数据，降低后端复杂度。安卓关闭系统备份，卸载即清除。
- **EAS Update（安卓）**：正式包装有启动/回前台检查；下载完成后自动重启应用。饮食记录不随更新上传。
- **领域逻辑独立**：营养计算与页面分离，方便后续测试和后端迁移。
- **数据来源优先**：界面直接显示可信等级，避免AI估算伪装成精确测量。
