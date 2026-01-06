import { transformJSX } from "./transform/jsx-transformer";

/**
 * 生成可导出的单页面 HTML（使用 data URLs）
 */
export function createExportHTML(
  files: Map<string, string>,
  entryPoint: string = "/App.jsx"
): string {
  const existingFiles = new Set(files.keys());
  const imports: Record<string, string> = {
    react: "https://esm.sh/react@19",
    "react-dom": "https://esm.sh/react-dom@19",
    "react-dom/client": "https://esm.sh/react-dom@19/client",
    "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    "react/jsx-dev-runtime": "https://esm.sh/react@19/jsx-dev-runtime",
  };

  // 转换所有文件并生成 data URLs
  for (const [path, content] of files) {
    if (
      path.endsWith(".js") ||
      path.endsWith(".jsx") ||
      path.endsWith(".ts") ||
      path.endsWith(".tsx")
    ) {
      const { code, error } = transformJSX(content, path, existingFiles);

      if (!error && code) {
        // 创建 data URL（永久有效，可在导出的 HTML 中使用）
        const dataUrl =
          "data:text/javascript;charset=utf-8," + encodeURIComponent(code);

        // 添加所有路径变体以支持不同的 import 方式
        imports[path] = dataUrl;
        if (path.startsWith("/")) {
          imports[path.substring(1)] = dataUrl;
          imports["@" + path] = dataUrl;
          imports["@/" + path.substring(1)] = dataUrl;
        }

        // 无扩展名版本
        const withoutExt = path.replace(/\.(jsx?|tsx?)$/, "");
        imports[withoutExt] = dataUrl;
        if (withoutExt.startsWith("/")) {
          imports[withoutExt.substring(1)] = dataUrl;
          imports["@" + withoutExt] = dataUrl;
          imports["@/" + withoutExt.substring(1)] = dataUrl;
        }
      }
    }
  }

  // 收集所有 CSS 文件
  let styles = "";
  for (const [path, content] of files) {
    if (path.endsWith(".css")) {
      styles += `/* ${path} */\n${content}\n\n`;
    }
  }

  // 生成 HTML
  const importMapStr = JSON.stringify({ imports }, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UIGen Export - ${new Date().toLocaleString("zh-CN")}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root {
      width: 100vw;
      height: 100vh;
    }
    .error-boundary {
      color: #dc2626;
      padding: 1.5rem;
      border: 2px solid #dc2626;
      margin: 1rem;
      border-radius: 8px;
      background: #fef2f2;
    }
    .error-boundary h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }
    .error-boundary pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 0.875rem;
    }
  </style>
  ${styles ? `<style>\n${styles}</style>` : ""}
  <script type="importmap">${importMapStr}</script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';

    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', { className: 'error-boundary' },
            React.createElement('h2', null, '出错了'),
            React.createElement('pre', null, this.state.error?.toString())
          );
        }
        return this.props.children;
      }
    }

    async function loadApp() {
      try {
        const module = await import('${entryPoint}');
        const App = module.default || module.App;

        if (!App) {
          throw new Error('未找到默认导出或 App 导出。请确保 ${entryPoint} 有 export default 语句。');
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
          React.createElement(ErrorBoundary, null,
            React.createElement(App)
          )
        );
      } catch (error) {
        console.error('加载失败:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        document.getElementById('root').innerHTML =
          '<div class="error-boundary"><h2>加载失败</h2><pre>' +
          errorMsg + '</pre></div>';
      }
    }

    loadApp();
  </script>
</body>
</html>`;
}

/**
 * 触发 HTML 文件下载
 */
export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
