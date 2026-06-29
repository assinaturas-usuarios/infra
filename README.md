# assinatura-usuarios

Sistema de gestão de assinaturas composto por três microsserviços que se comunicam via Kafka e compartilham infraestrutura via Docker Compose.

## Microsserviços

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `ms-usuario` | 8081 | Cadastro e consulta de usuários |
| `ms-assinatura` | 8082 | Ciclo de vida de assinaturas (reativo) |
| `ms-pagamento` | 8083 | Processamento de pagamentos via Kafka |

## Pré-requisitos

- Docker 24+ e Docker Compose v2
- JDK 25 (apenas para desenvolvimento local)

## Subindo tudo com Docker

```bash
# Clonar e entrar na pasta
git clone <repo-url>
cd assinatura-usuarios

# Subir toda a infraestrutura + microsserviços, com o docker em execução local:
docker compose up --build

# Somente a infraestrutura (para desenvolvimento local)
docker compose up postgres redis kafka zookeeper kafka-ui zipkin prometheus grafana -d
```

> O `--build` reconstrói as imagens dos microsserviços. Omitir nas próximas execuções para usar o cache.

### Aguardar saúde dos serviços

O Compose usa `healthcheck` em todos os serviços de infraestrutura. Os microsserviços só sobem após postgres, redis e kafka estarem saudáveis. Acompanhar com:

```bash
docker compose ps
docker compose logs -f ms-assinatura
```

## Serviços e URLs

| Serviço | URL | Credenciais |
|---|---|---|
| ms-usuario API | http://localhost:8081 | — |
| ms-assinatura API | http://localhost:8082 | — |
| ms-pagamento | http://localhost:8083 | — |
| Swagger ms-usuario | http://localhost:8081/swagger-ui.html | — |
| Swagger ms-assinatura | http://localhost:8082/swagger-ui.html | — |
| Kafka UI | http://localhost:8090 | — |
| Kibana | http://localhost:5601 | — |
| Zipkin | http://localhost:9411 | — |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | admin / admin |
| PostgreSQL | localhost:5432 | admin / admin123 |
| Redis | localhost:6379 | — |

## Fluxo entre microsserviços

```
POST /v1/usuarios          →  ms-usuario  →  usuario_db
POST /v1/assinaturas       →  ms-assinatura  →  assinatura_db + Redis

Scheduler (00:00 diário)
  ms-assinatura publica no → [assinatura.renovacao.solicitada] → ms-pagamento consome
  ms-pagamento realiza → SimuladorPagamento → e salva no pagamento_db
  ms-pagamento publica no → [pagamento.resultado] → ms-assinatura consome
  ms-assinatura realiza → atualização status + invalidação cache + publica nos tópicos [assinatura.suspensa | assinatura.cancelada] disponíveis para serem utilizados como notificação, ou outros microsserviços
```

## Exemplos rápidos

```bash
# 1. Criar usuário
curl -X POST http://localhost:8081/v1/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome": "Ana Lima", "email": "ana@email.com"}'

# 2. Criar assinatura (usar o id retornado acima)
curl -X POST http://localhost:8082/v1/assinaturas \
  -H "Content-Type: application/json" \
  -d '{"usuarioId": "<id>", "plano": "PREMIUM"}'

# 3. Listar assinaturas com paginação por cursor
curl "http://localhost:8082/v1/assinaturas?status=ATIVA&tamanho=10"

# 4. Cancelar assinatura
curl -X DELETE http://localhost:8082/v1/assinaturas/<id>/cancelar
```

## Tópicos Kafka

| Tópico | Produtor | Consumidor |
|---|---|---|
| `assinatura.renovacao.solicitada` | ms-assinatura | ms-pagamento |
| `pagamento.resultado` | ms-pagamento | ms-assinatura |
| `assinatura.cancelada` | ms-assinatura | — |
| `assinatura.suspensa` | ms-assinatura | — |

DLTs configuradas: `pagamento.resultado.DLT`, `assinatura.renovacao.solicitada.DLT`

## Parando e limpando

```bash
# Parar sem remover volumes
docker compose down

# Parar e remover todos os volumes (reset completo)
docker compose down -v
```

## Testes

```bash
# Em cada microsserviço
cd ms-assinatura
./mvnw test                # roda testes
./mvnw verify              # testes + cobertura JaCoCo (mínimo 90%)
```

## Documentação adicional
- [ms-assinatura](ms-assinatura/README.md)
- [ms-usuario](ms-usuario/README.md)
- [ms-pagamento](ms-pagamento/README.md)
