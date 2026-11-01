# 0001 - S3 target, no MinIO

Status: accepted

Decision: Iceberg storage is S3 on AWS. Local runs use a filesystem warehouse and sqlite catalog. MinIO is not used.

Why: deployment target is AWS; avoid an emulator that exists only locally. Env-driven warehouse URI keeps one code path (`src/prism/config.py`).

Consequence: local/AWS parity gap for S3 auth and Glue behaviour. Cover with an AWS smoke test in plan step 8.
