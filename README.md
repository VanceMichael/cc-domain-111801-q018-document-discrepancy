# DocumentDiscrepancy

DocumentDiscrepancy 为业务资料员提供交单通知补领与原文保管，已支持来源目录预览、直接记录领取、交单尝试身份、银行收件依据、原件版次保留以及按业务范围形成收件记录。原文与领域收件结论分开保存，便于复查来源内容。

## 环境与运行

使用 Node.js 22.23.4，依赖版本由 `package-lock.json` 固定。仅使用 Node.js 内置模块，无需外部数据库进程或第三方运行服务。

```sh
npm ci
npm run build
npm test
npm run demo
```

`npm run demo` 在本机启动合作源，用独立临时目录完成真实领取、原文保存和领域接收，输出实际结果后清理；不要求外网资料。`npm start` 可单独启动本地来源供交互查看，终端会打印实际回环地址，Ctrl-C 关闭。

## 容器

```sh
docker build -t document-discrepancy:local .
docker run --rm --network none document-discrepancy:local
```

镜像构建时准备依赖，容器运行时不联网，演示只使用回环通信。可改用 `docker run --rm --network none document-discrepancy:local npm test` 运行回归。存储通过 `Archive` 传入本机目录，不包含生产账号、真实业务资料或凭据。

## 代码与来源约定

`src/source.mjs` 负责来源目录与原文身份，`src/interpret.mjs` 解释当前领域记录，`src/receiving.mjs` 决定选定范围内的收件结果。`src/archive.mjs` 提供原文保管及收据落库，`src/app.mjs` 连接日常业务，`fixtures/` 与 `src/fixture-source.mjs` 提供可独立复查的本地合作源。详细字段与来源声明见 `docs/source-contract.md`。
