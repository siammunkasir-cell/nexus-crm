#!/bin/bash
cd /data/data/com.termux/files/home/nexus-crm
export PRISMA_QUERY_ENGINE_LIBRARY=/data/data/com.termux/files/home/nexus-crm/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node
npx tsx apps/api/src/index.ts
