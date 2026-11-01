# AWS deploy (stub)

Planned mapping, filled in at plan step 8.

| Local | AWS |
|---|---|
| Postgres container | RDS Postgres (logical replication on) |
| Kafka + Debezium | MSK + MSK Connect (Debezium) |
| Flink containers | Managed Service for Apache Flink |
| Local dir warehouse + sqlite catalog | S3 + Glue catalog |
| Redis container | ElastiCache for Redis |
| App containers | ECS (Fargate) |

Switch: use `config/aws.env.example` (`STORAGE_BACKEND=s3`). Infra code goes in `infra/terraform/`.
