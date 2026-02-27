# iOS E2E 环境约束（团队统一）

> 范围声明：Detox E2E 仅运行在 iOS Simulator；Android 不在本约束文档范围。

## 1. 必备环境

1. macOS + Xcode（可运行 iOS Simulator）
2. Node.js >= 22（项目要求）
3. npm >= 10
4. CocoaPods（`pod --version` 必须可执行）
5. Detox（项目 devDependencies 已声明）

## 2. 推荐环境

1. watchman（提升文件监听稳定性）
2. 保持 Xcode Command Line Tools 指向当前 Xcode

## 3. 一键自检

在前端目录执行：

```bash
npm run e2e:env:check:ios
```

脚本位置：`scripts/check_e2e_ios_env.sh`

## 4. 强制约束

1. `pod` 命令存在但报错，视为环境不合格
2. `xcodebuild` 或 `simctl` 不可用，视为环境不合格
3. 未通过环境自检，不允许触发 iOS E2E CI 任务
4. 不得在项目内新增 Android Detox 配置或 Android Detox CI Job
5. 系统代理开启时，必须确保 `localhost/127.0.0.1` 不走代理（否则 Detox 握手可能超时）

## 5. 当前已知风险（本机样例）

1. CocoaPods Ruby 依赖冲突（`pod --version` 报 ActiveSupport/Logger 错误）
2. watchman 缺失（非阻断，但建议安装）

## 6. 常用修复建议

1. CocoaPods 异常
```bash
brew reinstall cocoapods
brew unlink cocoapods && brew link cocoapods
```

2. watchman 缺失
```bash
brew install watchman
```

3. Xcode CLI 工具重设
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -runFirstLaunch
```

4. 代理影响 Detox 握手（常见）
```bash
# 检查当前网络服务代理状态
networksetup -getwebproxy Wi-Fi
networksetup -getsecurewebproxy Wi-Fi
networksetup -getsocksfirewallproxy Wi-Fi
```

## 7. 验收前最小命令集

```bash
npm run e2e:env:check:ios
npm run e2e:test:smoke
```
