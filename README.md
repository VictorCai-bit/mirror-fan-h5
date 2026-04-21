`pnpm install && pnpm dev` — open http://localhost:5173 (MSW runs in development only).

顶栏 ⚙ 打开 Debug：切换演示钱包 / Admin / `creator_of` / Reset Mock DB。

`localStorage.removeItem('mockDb@v1')` 后刷新页面，等价重置 MSW 内存库。
