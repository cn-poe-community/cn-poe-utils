# POB

用于POB的集成测试，将中文JSON翻译为英文JSON，然后传入POB。

## 环境需求

集成测试依赖以下环境：

- Windows10+
- Python3
- Bun
- POB最新版本

## 测试准备

1.复制`config.json.demo`为`config.json`，并根据环境修改相关值。

2.启动服务：

```
python ./test.py
```

3.使用POB测试服务，选择服务器为Tencent，并测试导入角色。

## 常见问题

### 1. 导入网络错误

检查是否设置了代理服务器，SOCKS5代理模式下，需要代理服务器将本地流量配置为直接连接。HTTP代理模式下，需要代理服务器支持`HTTP Proxy`协议而非仅`HTTP Tunnel`协议。最佳方式是取消代理设置。

### 2. 测试修改了POB文件，如何恢复默认值

POB的更新可以将修改的文件恢复为默认值，更新如果没更新说明，则只恢复被修改的文件。

### 3. test.py做了什么

test.py做了以下工作：

- 将`ImportTab.lua`中的腾讯服域名替换为本地地址。
- 将`cn-poe-utils`打包为tarball，并更新为当前依赖版本。
- 执行`bun run ./index.ts`启动服务。

因此如果未恢复`ImportTab.lua`，且未修改`cn-poe-utils`，可以直接使用`bun run ./index.ts`启动服务。
