import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getServerInfo, getArticles } from "@/server/ssr-functions";

// 路由定义：使用 loader 在服务端预取数据
export const Route = createFileRoute("/ssr")({
  loader: async () => {
    // loader 在服务端执行，数据会嵌入到初始 HTML 中
    const [serverInfo, articlesData] = await Promise.all([
      getServerInfo(),
      getArticles(),
    ]);
    return { serverInfo, articlesData };
  },
  component: SSRPage,
});

function SSRPage() {
  const { serverInfo, articlesData } = Route.useLoaderData();
  const [clientTime, setClientTime] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  // 客户端水合后记录时间，用于对比 SSR 时间
  React.useEffect(() => {
    setClientTime(new Date().toLocaleString("zh-CN"));
    setHydrated(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-8">
        <SSRPageHeader />
        <ServerInfoCard
          serverInfo={serverInfo}
          clientTime={clientTime}
          hydrated={hydrated}
        />
        <ArticleListCard
          articles={articlesData.articles}
          fetchedAt={articlesData.fetchedAt}
        />
        <SSRExplanation />
        <BackToHomeLink />
      </div>
    </div>
  );
}

// 页面标题
function SSRPageHeader() {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold text-foreground">SSR 示例页面</h1>
      <p className="text-muted-foreground">
        此页面的数据在服务端渲染时预取，无需客户端加载
      </p>
    </div>
  );
}

// 服务端信息卡片
function ServerInfoCard({
  serverInfo,
  clientTime,
  hydrated,
}: {
  serverInfo: {
    serverTime: string;
    serverTimeFormatted: string;
    runtime: string;
    renderType: string;
  };
  clientTime: string;
  hydrated: boolean;
}) {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h2 className="text-lg font-semibold">服务端信息</h2>
      <p className="text-sm text-muted-foreground">
        以下数据在服务端渲染时获取，直接嵌入到 HTML 中
      </p>
      <div className="space-y-2 text-sm">
        <InfoRow label="渲染类型" value={serverInfo.renderType} />
        <InfoRow label="运行环境" value={serverInfo.runtime} />
        <InfoRow label="服务端渲染时间" value={serverInfo.serverTimeFormatted} />
        <InfoRow
          label="客户端水合时间"
          value={hydrated ? clientTime : "水合中..."}
        />
      </div>
      {hydrated && (
        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
          提示：服务端时间和客户端时间的差异说明页面是在服务端预渲染的
        </p>
      )}
    </div>
  );
}

// 信息行组件
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-dashed">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

// 文章列表卡片
function ArticleListCard({
  articles,
  fetchedAt,
}: {
  articles: { id: number; title: string; summary: string; date: string }[];
  fetchedAt: string;
}) {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h2 className="text-lg font-semibold">文章列表（服务端预取）</h2>
      <p className="text-sm text-muted-foreground">
        数据通过 loader 在服务端获取，页面加载时已可用
      </p>
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleItem key={article.id} article={article} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        数据获取时间: {new Date(fetchedAt).toLocaleString("zh-CN")}
      </p>
    </div>
  );
}

// 单篇文章项
function ArticleItem({
  article,
}: {
  article: { id: number; title: string; summary: string; date: string };
}) {
  return (
    <div className="p-3 bg-muted rounded-md">
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-foreground">{article.title}</h3>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {article.date}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{article.summary}</p>
    </div>
  );
}

// SSR 原理说明
function SSRExplanation() {
  return (
    <div className="space-y-3 p-6 border rounded-lg bg-muted/30">
      <h2 className="text-lg font-semibold">SSR 工作原理</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>1. 服务端渲染：</strong>
          用户请求页面时，服务端执行路由 loader，获取数据并渲染完整 HTML。
        </p>
        <p>
          <strong>2. 客户端水合：</strong>
          浏览器接收 HTML 后，React 进行水合（hydration），绑定事件监听器。
        </p>
        <p>
          <strong>3. 优势：</strong>
          首屏加载快、SEO 友好、用户无需等待数据加载即可看到内容。
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        验证方法：右键"查看页面源代码"，可以看到文章列表数据已嵌入 HTML 中
      </p>
    </div>
  );
}

// 返回首页链接
function BackToHomeLink() {
  return (
    <div className="text-center pt-4">
      <Link to="/">
        <Button variant="outline">← 返回首页</Button>
      </Link>
    </div>
  );
}
