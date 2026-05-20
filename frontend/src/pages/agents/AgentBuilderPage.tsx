export function AgentBuilderPage() {
  return (
    <section className="simple-page">
      <div className="simple-page__card">
        <h1>Agent Builder</h1>
        <p>
          当前阶段只保留简化入口。比赛 MVP 的重点仍然是 Workspace 中的多
          Agent 会话、TaskRun 和 Artifact 协作链路。
        </p>
        <div className="simple-page__grid">
          <div>
            <h2>后续计划</h2>
            <ul>
              <li>自定义 Agent 名称与头像</li>
              <li>System Prompt 配置</li>
              <li>Tool Tags / Capability Tags</li>
              <li>与 Workspace 会话集成</li>
            </ul>
          </div>
          <div>
            <h2>当前建议</h2>
            <ul>
              <li>先在 Workspace 中跑通 Demo 会话</li>
              <li>验证消息流、TaskRun、Artifact 三条数据链路</li>
              <li>后续再补 Agent Builder 表单</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
