# DocumentDiscrepancy 来源约定

此服务管理交单通知补领、不符点范围解释及补正资料接收。
当前常规业务使用一个选定来源上下文处理直接列出的记录。目录请求为 `GET /presentation/P1`，返回 `presentation` 与 `documents`。每个目录成员以 `id`、`href` 提供来源身份与原文位置，原文中的 `document` 和 `presentation` 必须与目录一致。

## 记录含义

```json
{
  "document": "DOC1",
  "presentation": "P1",
  "bank": "BANK-A",
  "kind": "invoice",
  "revision": "1",
  "received": true,
  "body": "合成商业单据"
}
```

这里的字段是来源提供的原始声明，数值文本必须符合十进制规则，不能把空白或未知值转换成零。领域解释保留交单尝试身份、银行收件依据、原件版次保留。只有所选范围内且有充分常规依据的记录列入当前收件；其他范围、待确认、历史和冲突分别保留结果，不用覆盖旧原文消除分歧。

## 本地合作源

`fixtures/source.json` 的 `resources` 是本地来源的 URL 路径到响应正文的映射；只绑定回环地址，不连接真实监管、银行或合作方。原文可通过目录声明的位置取得。同一来源也可发布关联资料，当前示例的关联资料位置为 `/presentation/P1/relations/DOC1`，字段保留来源的业务含义：

```json
{
  "discrepancies": [
    {
      "id": "X1",
      "bank": "BANK-A",
      "scope": "whole-document"
    }
  ],
  "correction": {
    "received": true,
    "reviewed": false
  }
}
```

`fixtureSource` 支持独立实例、指定路径返回码、一次性来源故障、响应延迟与 `replace` 更新资源；访问记录保留实际请求路径，不凭空生成未收到的响应。测试在进程内操作夹具，不提供对外开放的管理接口。目录不承诺所有关联资料与当前目录同时发布；HTTP 404、403、503 不能自行解释为业务删除。

## 原文和收件

原文字节按 SHA-256 寻址，SQLite 保存来源位置、观察时间、收件范围、业务身份、领域记录与决策。收到原文不等于领域接收成功；重复的同一内容不新增收据，同一身份的不同内容不会覆盖原件。`.data/` 仅用于本机数据，演示使用临时目录，运行结束关闭服务并清理临时状态。
