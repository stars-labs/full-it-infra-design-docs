---
sidebar_position: 8
---

# 快速部署参考

本文档提供大模型推理集群的快速部署参考,包括完整的Docker Compose配置和常用运维命令。

## Docker Compose 完整配置

以下是一个完整的Docker Compose配置,包含vLLM推理服务、Qdrant向量数据库、Nginx反向代理、Prometheus监控和Grafana可视化。

```yaml
version: '3.8'

services:
  # vLLM推理服务
  vllm:
    image: vllm/vllm-openai:latest
    container_name: vllm-inference
    ports: ["8000:8000"]
    volumes:
      - ./models:/models
      - ./data:/data
    command: >
      --model deepseek-ai/deepseek-coder-6.7b-instruct
      --tensor-parallel-size 4
      --gpu-memory-utilization 0.9
      --max-model-len 8192
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0', '1', '2', '3']
              capabilities: [gpu]

  # Qdrant向量数据库
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports: ["6333:6333", "6334:6334"]
    volumes:
      - ./qdrant/storage:/qdrant/storage
    command: ./qdrant --grpc-port 6334 --port 6333

  # Nginx反向代理
  nginx:
    image: nginx:1.24-alpine
    container_name: nginx-proxy
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on: [vllm, qdrant]

  # Prometheus监控
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports: ["9090:9090"]
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/data:/prometheus
    command: ['--config.file=/etc/prometheus/prometheus.yml', '--storage.tsdb.path=/prometheus']

  # Grafana可视化
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports: ["3000:3000"]
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on: [prometheus]
```

### 快速启动

```bash
# 1. 克隆或创建项目目录
mkdir llm-cluster && cd llm-cluster

# 2. 创建必要的目录结构
mkdir -p models data qdrant/storage nginx/ssl prometheus/data grafana/data grafana/provisioning

# 3. 将上面的配置保存为 docker-compose.yml

# 4. 启动所有服务
docker-compose up -d

# 5. 查看服务状态
docker-compose ps

# 6. 查看日志
docker-compose logs -f
```

## 常用运维命令

### GPU监控

```bash
# GPU状态监控（每秒刷新）
nvidia-smi -l 1

# 查看GPU详细信息
nvidia-smi -q

# 查看CUDA版本
nvcc --version

# 检查GPU是否可用
python -c "import torch; print(torch.cuda.is_available())"
```

### vLLM服务

```bash
# 测试vLLM服务
curl http://localhost:8000/v1/models

# 发送推理请求
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/deepseek-coder-6.7b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 查看vLLM日志
docker logs -f vllm-inference --tail 100

# 重启vLLM服务
docker-compose restart vllm
```

### Qdrant向量库

```bash
# Qdrant健康检查
curl http://localhost:6333/health

# 创建集合
curl -X PUT http://localhost:6333/collections/my_collection \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    }
  }'

# Qdrant备份
docker exec qdrant qdrant-backup create

# 查看Qdrant日志
docker logs -f qdrant --tail 100
```

### Docker管理

```bash
# 查看所有容器
docker ps -a

# 查看容器资源使用
docker stats

# 重启所有服务
docker-compose restart

# 停止所有服务
docker-compose down

# 停止并删除数据
docker-compose down -v

# 查看服务日志
docker-compose logs -f [service_name]

# 进入容器
docker exec -it [container_name] /bin/bash
```

### 系统监控

```bash
# 系统负载监控
htop

# 查看内存使用
free -h

# 查看磁盘使用
df -h

# 查看磁盘IO
iostat -x 1

# 查看网络连接
netstat -tuln
```

### 性能测试

```bash
# 网络带宽测试
iperf3 -s  # 服务端
iperf3 -c <服务器IP>  # 客户端

# 磁盘IO测试
fio --name=randread --ioengine=libaio --iodepth=1 \
    --rw=randread --bs=4k --direct=1 --size=1G \
    --numjobs=1 --runtime=60 --time_based \
    --group_reporting --filename=/data/test

# 压力测试
stress --cpu 4 --io 2 --vm 1 --vm-bytes 128M --timeout 300s
```

### 备份与恢复

```bash
# Qdrant数据库备份
docker exec qdrant qdrant-backup create

# 恢复Qdrant备份
docker exec qdrant qdrant-backup restore

# 备份Docker volumes
docker run --rm -v qdrant_storage:/data -v $(pwd):/backup alpine tar czf /backup/qdrant-backup.tar.gz /data

# 恢复Docker volumes
docker run --rm -v qdrant_storage:/data -v $(pwd):/backup alpine tar xzf /backup/qdrant-backup.tar.gz -C /
```

## 服务端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| vLLM | 8000 | 推理API服务 |
| Qdrant HTTP | 6333 | 向量库HTTP接口 |
| Qdrant gRPC | 6334 | 向量库gRPC接口 |
| Nginx HTTP | 80 | Web服务 |
| Nginx HTTPS | 443 | HTTPS服务 |
| Prometheus | 9090 | 监控数据 |
| Grafana | 3000 | 可视化面板 |

## 故障排查

### GPU相关

```bash
# GPU温度过高
nvidia-smi -q -d TEMPERATURE

# GPU显存使用
nvidia-smi --query-gpu=memory.used,memory.total --format=csv

# 清理GPU缓存
python -c "import torch; torch.cuda.empty_cache()"
```

### 容器相关问题

```bash
# 查看容器占用资源
docker stats --no-stream

# 查看容器详细日志
docker logs --tail 500 [container_name]

# 容器无法启动
docker inspect [container_name]
```

### 网络问题

```bash
# 检查端口是否监听
netstat -tuln | grep -E '8000|6333|9090'

# 测试服务连通性
curl -v http://localhost:8000/v1/models

# 检查防火墙规则
sudo iptables -L -n
```

## 参考资料

- [vLLM官方文档](https://docs.vllm.ai/)
- [Qdrant官方文档](https://qdrant.tech/documentation/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [Prometheus文档](https://prometheus.io/docs/)
- [浪潮AI服务器产品手册](https://www.inspur.com/)
- [NVIDIA GPU技术博客](https://developer.nvidia.com/blog/)

## 相关文档

- [软件栈推荐](./software-stack) - 推理框架和向量库选型
- [办公室部署环境](./deployment-environment) - 网络架构设计
- [采购清单与验收](./procurement) - 验收测试清单
