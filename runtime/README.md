# Teacher Grants Web Runtime

這個目錄是可上傳至 QNAP Container Station 的 production runtime 包。

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
