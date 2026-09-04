# Data Files

這個資料夾放置各儀表板頁面使用的 CSV 檔。

| 檔案 | 使用頁面 | 說明 |
| --- | --- | --- |
| `grants_112_114.csv` | `/grants` | 獎補助資料 |
| `teaching_awards_114_115.csv` | `/teaching` | 教學精進資料，含年度欄位 |
| `papers_112_114.csv` | `/papers`, `/teachers` | 論文發表資料 |
| `projects_112_114.csv` | `/projects`, `/teachers` | 計畫承接資料 |
| `teachers_114_2.csv` | `/teachers` | 教師聘任主資料 |
| `patent.csv` | `/teachers` | 專利資料 |
| `transfer.csv` | `/teachers` | 技術移轉資料 |

更名或替換 CSV 時，請先更新 `src/lib/data-files.ts`，讓所有伺服器端資料載入程式使用同一份檔名對照。
