# OpenAPI 本地预览

使用 Docker 启动 Swagger UI 预览 `openapi-agent-bot-skills-tasks.yaml`。

## 一键启动

```bash
cd /Users/jason/Github/AgentTown/docs
./run-swagger-ui.sh
```

默认地址：

- `http://localhost:8090`

## 自定义端口

```bash
cd /Users/jason/Github/AgentTown/docs
PORT=8091 ./run-swagger-ui.sh
```

## 使用其他 OpenAPI 文件

```bash
cd /Users/jason/Github/AgentTown/docs
./run-swagger-ui.sh ./your-openapi.yaml
```
