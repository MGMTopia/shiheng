# 食衡 Shíhéng Mobile MVP

面向澳洲多元文化饮食场景的中英双语营养记录原型。项目使用 Expo SDK 57、React Native、TypeScript 和 Expo Router，一套代码支持 iOS、Android 与 Web。

> 当前版本用于验证产品流程。内置营养数据是开发样例，不应被用于临床判断、疾病管理或正式营养分析。

## 已完成的MVP流程

- 今日仪表盘：能量、蛋白质、膳食纤维和钠进度
- 中英文食品搜索与分类筛选
- 澳洲常见食品和中餐/混合餐样例数据
- 份量调整、餐次选择和本地记录
- 按早餐、午餐、晚餐、加餐查看日志
- 基于一般健康目标的下一餐搭配提示
- 数据来源、地区和可信等级展示
- 目标预设、本地持久化与数据清除
- 明确的一般健康/非医疗用途边界

## 开始运行

环境要求：Node.js LTS、pnpm，以及手机上的兼容 Expo Go 或本地开发构建。

```powershell
cd D:\health\mobile
pnpm install
pnpm start
```

常用命令：

```powershell
pnpm run typecheck       # TypeScript检查
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
  data/foods.ts          开发样例食品数据
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

正式数据接入顺序建议：

1. 导入并核验FSANZ Australian Food Composition Database。
2. 核查许可后加入AUSNUT复合食物映射。
3. 通过FSANZ品牌库、GS1或品牌标签建立包装食品层。
4. 为中餐和亚洲餐建立经APD审核的配方区间。
5. 最后加入标签OCR、条码和用户提交审核工作流。

不要把当前 `foods.ts` 中的样例值直接迁移到生产数据库。

## 后续开发优先级

### P0：验证前必须完成

- 替换为可追溯的正式澳洲食品数据
- 增加真实用户研究埋点：记录耗时、搜索失败、修正次数
- 食物收藏、常吃餐食和复制上一餐
- 自定义份量和用户纠错反馈
- 单元测试、错误边界及数据迁移测试

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

- 产品文案保持“支持一般健康”“估算”“日常参考”等表述。
- 不提供疾病诊断、治疗、临床监测或基于化验结果的自动治疗建议。
- 接入云端或境外AI服务前完成澳洲隐私影响评估和跨境数据审查。
- 孕期、儿童、进食障碍、肾病、糖尿病及过敏等场景需专业转介与单独安全设计。

## 当前技术决策

- **Expo Router**：文件路由同时支持原生与Web。
- **AsyncStorage**：验证期只在本机保存数据，降低后端复杂度。
- **领域逻辑独立**：营养计算与页面分离，方便后续测试和后端迁移。
- **数据来源优先**：界面直接显示可信等级，避免AI估算伪装成精确测量。
