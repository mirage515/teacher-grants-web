# Teacher Grants Web Runtime

這個目錄是可上傳至 QNAP Container Station 的 production runtime 包。

Windows Server 2022 的 IIS 與 Node.js 安裝腳本位於 `scripts/install-windows-server-2022.ps1`；請在正式伺服器以系統管理員 PowerShell 執行。

對應解除安裝腳本為 `scripts/uninstall-windows-server-2022.ps1`。預設只移除 `TeacherGrantsWeb` 服務；Node.js、IIS、IIS 模組與應用程式資料都必須明確指定參數才會移除。

## 啟動方式

在此目錄執行：

```bash
docker compose up -d --build
```

或在 Container Station 以 `docker-compose.yml` 建立 application。

## 服務設定

- Container：`teacher-grants-web`
- Port：NAS `3000` → container `3000`
- Health check：`/api/health`
- Restart policy：`unless-stopped`
- Data：已包含本版本 `data/` CSV，容器內以唯讀方式使用

瀏覽：`http://<QNAP-IP>:3000`。

## 更新流程

1. 先備份 QNAP 上目前的 runtime 目錄。
2. 將新版 runtime 目錄上傳並確認檔案完整。
3. 在 Container Station 重新 build/recreate application。
4. 確認 `http://<QNAP-IP>:3000/api/health` 回傳 `status: healthy`。
5. 再確認 `/grants`、`/teaching`、`/papers`、`/projects`、`/teachers`。

本包不包含開發用 `node_modules`、`.next` 原始 build cache 或 git metadata。
