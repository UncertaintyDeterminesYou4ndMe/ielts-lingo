/* eslint-disable @typescript-eslint/no-require-imports */
// electron-builder 会跳过任何名为 node_modules 的嵌套目录，导致 .next/node_modules
// 里的别名符号链接（如 better-sqlite3-<hash> -> ../../node_modules/better-sqlite3）
// 在打包产物中丢失。Turbopack 构建的 server 代码靠这些别名解析原生外部模块，
// 缺失会导致运行时 "Failed to load external module ...-<hash>"。
// 这里在打包后把 .next/node_modules 原样（保留符号链接）复制回去。
const path = require("node:path");
const fs = require("node:fs");

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const src = path.join(packager.projectDir, ".next", "node_modules");

  if (!fs.existsSync(src)) {
    console.log("[after-pack] 未发现 .next/node_modules，跳过");
    return;
  }

  const appName = packager.appInfo.productFilename;
  const resourcesApp =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${appName}.app`, "Contents", "Resources", "app")
      : path.join(appOutDir, "resources", "app");

  const dest = path.join(resourcesApp, ".next", "node_modules");
  fs.rmSync(dest, { recursive: true, force: true });
  // verbatimSymlinks: 原样复制符号链接（保留相对目标），不跟随解引用
  fs.cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
  console.log("[after-pack] 已补回 .next/node_modules 别名符号链接 ->", dest);
};
