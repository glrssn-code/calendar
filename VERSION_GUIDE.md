# 更新版本号注意事项

## 版本号统一位置

更新版本号时，需要同步修改以下位置：

| 文件 | 位置 |
|------|------|
| `package.json` | `version` 字段（第3行） |
| `app/settings/page.tsx` | "关于"部分显示的版本号（约第647行） |
| `README.md` | 版本徽章和releases路径（多处） |
| `lib/backup.ts` | `createBackup()` 中的 `appVersion` 字段 |

## 更新流程

1. 修改 `package.json` 中的 `version`
2. 修改 `app/settings/page.tsx` 中的版本显示
3. 修改 `README.md` 中的版本徽章和路径
4. 修改 `lib/backup.ts` 中的 `appVersion`
5. 运行 `npm run build` 确保构建成功
6. 提交更改
