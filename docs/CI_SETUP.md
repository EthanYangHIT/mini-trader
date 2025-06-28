# CI/CD 设置指南

本项目使用 GitHub Actions 进行自动化 CI/CD 流程，包括代码质量检查、测试、性能测试和自动部署。

## 工作流程

### 1. Lint & Type Check

- **ESLint 检查**: 检查代码质量和风格
- **TypeScript 类型检查**: 确保类型安全
- **Prettier 格式检查**: 确保代码格式一致

### 2. Build

- 构建项目并生成生产文件
- 上传构建产物供后续步骤使用

### 3. Lighthouse CI

- 性能测试和最佳实践检查
- 可访问性检查
- SEO 优化检查
- 生成性能报告

### 4. Playwright Tests

- 端到端测试
- 自动化浏览器测试
- 生成测试报告

### 5. Deploy (仅 main 分支)

- 自动部署到 GitHub Pages
- 仅在所有检查通过后执行

## 配置要求

### 1. GitHub Secrets

在 GitHub 仓库设置中添加以下 secrets：

#### LHCI_GITHUB_APP_TOKEN (可选)

用于 Lighthouse CI 的 GitHub 集成：

1. 访问 [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci)
2. 安装应用到你的仓库
3. 获取 token 并添加到 secrets

#### CNAME (可选)

如果你有自定义域名：

1. 在仓库设置中启用 GitHub Pages
2. 添加自定义域名到 CNAME secret

### 2. 本地开发

确保安装了所有依赖：

```bash
npm install
```

运行本地检查：

```bash
# 代码质量检查
npm run lint

# 类型检查
npm run type-check

# 格式检查
npm run format:check

# 运行测试
npm run test

# 构建项目
npm run build
```

## 性能基准

Lighthouse CI 设置了以下性能基准：

- **Performance**: ≥ 80 分
- **Accessibility**: ≥ 90 分
- **Best Practices**: ≥ 80 分
- **SEO**: ≥ 80 分
- **First Contentful Paint**: ≤ 2000ms
- **Largest Contentful Paint**: ≤ 4000ms
- **Cumulative Layout Shift**: ≤ 0.1
- **Total Blocking Time**: ≤ 300ms

## 故障排除

### 常见问题

1. **Lighthouse CI 失败**
   - 检查网络连接
   - 确保应用能正常启动
   - 查看 Lighthouse 报告了解具体问题

2. **Playwright 测试失败**
   - 检查测试环境
   - 查看测试报告
   - 确保所有依赖正确安装

3. **构建失败**
   - 检查 TypeScript 错误
   - 确保所有依赖正确安装
   - 查看构建日志

### 本地调试

```bash
# 本地运行 Lighthouse
npx lighthouse http://localhost:5174/mini-trader/ --output html

# 本地运行 Playwright 测试
npx playwright test

# 本地运行类型检查
npm run type-check
```

## 工作流程触发

CI 工作流程会在以下情况触发：

- 推送到 `main` 或 `develop` 分支
- 创建针对 `main` 或 `develop` 分支的 Pull Request

## 部署

部署仅在以下条件满足时执行：

- 推送到 `main` 分支
- 所有检查（lint、type-check、test、lighthouse）通过
- 构建成功

部署目标：GitHub Pages (`https://<username>.github.io/<repo-name>/`)
