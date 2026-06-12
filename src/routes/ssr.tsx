import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getServerInfo, getArticles } from "@/server/ssr-functions";

// Route definition: use loader to prefetch data on the server
export const Route = createFileRoute("/ssr")({
  loader: async () => {
    // loader runs on the server; data is embedded in the initial HTML
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

  // Record time after client hydration to compare with the SSR timestamp
  React.useEffect(() => {
    setClientTime(new Date().toLocaleString("en-US"));
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

// Page header
function SSRPageHeader() {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold text-foreground">SSR Example Page</h1>
      <p className="text-muted-foreground">
        This page&apos;s data is prefetched during server-side rendering — no client-side loading required
      </p>
    </div>
  );
}

// Server info card
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
      <h2 className="text-lg font-semibold">Server Info</h2>
      <p className="text-sm text-muted-foreground">
        The following data was fetched during server-side rendering and embedded directly in the HTML
      </p>
      <div className="space-y-2 text-sm">
        <InfoRow label="Render type" value={serverInfo.renderType} />
        <InfoRow label="Runtime" value={serverInfo.runtime} />
        <InfoRow label="Server render time" value={serverInfo.serverTimeFormatted} />
        <InfoRow
          label="Client hydration time"
          value={hydrated ? clientTime : "Hydrating..."}
        />
      </div>
      {hydrated && (
        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
          Tip: the difference between the server time and the client time confirms the page was pre-rendered on the server
        </p>
      )}
    </div>
  );
}

// Info row component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-dashed">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

// Article list card
function ArticleListCard({
  articles,
  fetchedAt,
}: {
  articles: { id: number; title: string; summary: string; date: string }[];
  fetchedAt: string;
}) {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h2 className="text-lg font-semibold">Article List (server-prefetched)</h2>
      <p className="text-sm text-muted-foreground">
        Data is fetched via the loader on the server and is available as soon as the page loads
      </p>
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleItem key={article.id} article={article} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Fetched at: {new Date(fetchedAt).toLocaleString("en-US")}
      </p>
    </div>
  );
}

// Single article item
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

// SSR explanation
function SSRExplanation() {
  return (
    <div className="space-y-3 p-6 border rounded-lg bg-muted/30">
      <h2 className="text-lg font-semibold">How SSR Works</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>1. Server-side rendering:</strong>{" "}
          When a user requests the page, the server runs the route loader, fetches data, and renders full HTML.
        </p>
        <p>
          <strong>2. Client hydration:</strong>{" "}
          After the browser receives the HTML, React hydrates it and attaches event listeners.
        </p>
        <p>
          <strong>3. Benefits:</strong>{" "}
          Fast initial paint, SEO-friendly, and users see content without waiting for data to load.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        To verify: right-click and &quot;View Page Source&quot; — you&apos;ll see the article list data already embedded in the HTML
      </p>
    </div>
  );
}

// Back to home link
function BackToHomeLink() {
  return (
    <div className="text-center pt-4">
      <Link to="/">
        <Button variant="outline">← Back to home</Button>
      </Link>
    </div>
  );
}
