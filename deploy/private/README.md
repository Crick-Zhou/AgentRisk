# 私有服务器部署

本目录是通用部署模板，不包含原服务器地址、原站点标识、真实 API Key 或登录账号数据。它不会连接或修改已有部署。

## 本地演示

在仓库根目录运行 `npm start`，访问 `http://127.0.0.1:4175`。本地服务没有账号登录，仅绑定本机，不应直接暴露到公网。免密钥模式无需提供服务商凭据。

## 带登录的服务

`server/private.mjs` 从独立文件读取模型凭据和账号配置。凭据文件包含以下字段，值由部署者在可信环境中自行填写，不要提交到 Git：

```text
openai_api_key=YOUR_OPENAI_KEY
deepseek_api_key=YOUR_DEEPSEEK_KEY
```

账号文件由以下脚本生成。必须显式指定用户名；公网访问时还应提供实际 HTTPS 来源地址。脚本会在终端显示一次生成的登录密码，请安全保存，不要把终端输出上传。已有目标文件不会被覆盖。

```sh
node deploy/private/create-account.mjs /secure/path/auth.json YOUR_USERNAME https://your-host.example
```

账号文件只保存用户名、盐、密码哈希和允许的来源，不保存明文密码。文件丢失或格式错误时服务拒绝启动。当前是单账号演示版本，不是完整的组织用户管理系统。

## Docker Compose

部署者需将上述凭据和账号文件分别安全放置为 `/etc/agentrisk/dev.env`、`/etc/agentrisk/auth.json`，并限制目录及文件权限：仅主机管理员和容器 GID 10001 可读取，普通用户不可读。不要将它们复制进源码目录或 Docker 镜像。

在仓库根目录运行：

```sh
docker compose -f deploy/private/compose.yaml up -d --build
```

模板仅将业务端口发布到宿主机 `127.0.0.1:18475`，容器以非 root 用户、只读根文件系统和资源限制运行。公网访问需要部署者另行配置具有有效证书的 HTTPS 反向代理。代理应保留实际 Host、设置 `X-Forwarded-Proto: https`，并覆盖 `X-AgentRisk-Client-IP` 为可信的客户端地址；不要信任浏览器提交的同名头。允许的 HTTPS 来源必须与生成账号时提供的地址一致。不要把业务端口直接改为公网明文 HTTP。

会话 Cookie 使用 HttpOnly、SameSite；HTTPS 下使用 Secure。登录有限流，业务接口需认证，写操作校验同源来源。模型密钥固定绑定相应的 OpenAI / DeepSeek 官方接口。默认模型名可以在界面调整，实际可用性及费用以服务商账号为准。

## 数据与维护

- 测试只使用合成数据和模拟工具，不连接真实银行业务。
- 运行记录只在当前浏览器页面保留，刷新前请导出。
- API 调用可能产生费用，自动化测试使用替身，不消费真实模型接口。
- 更换账号文件或重启应用会使已有登录会话失效。
- 更新前保留原版本及配置备份；不要将旧的无登录服务暴露到公网。
- `.gitignore` 与 `.dockerignore` 是辅助保护，提交前仍需检查文件清单，不能仅依赖忽略规则。
