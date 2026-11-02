# Madrio

基于 [VitePress](https://vitepress.dev/) 的个人技术博客，主要内容是 Linux、FPV 穿越机和 3D 打印。

## 常用命令

```bash
npm install            # 安装依赖
npm run docs:dev       # 本地预览，默认 http://localhost:5173
npm run docs:build     # 构建静态站点，输出到 .vitepress/dist
npm run docs:preview   # 预览构建结果
```

## 目录结构

```text
.vitepress/
  config.mts        站点主配置（标题、logo、搜索、社交链接、语言）
  icons.ts          首页卡片图标和颜色
  sidebar.ts        侧边栏自动生成
  theme/
    index.ts        主题入口
    style.css       配色、字体和首页样式
docs/
  public/           静态资源（logo、头像），按根路径引用，如 /avatar2.png
  zh/               中文内容，通过 rewrites 映射到网站根路径
    config.mts      中文界面文字、页脚、编辑链接等
    index.md        首页
    linux/          一个目录就是一个栏目
      index.md      栏目概览页（必须有）
      debug/        子目录会成为侧边栏里的一个分组
        index.md    分组名
        gdb.md
```

`docs/zh/linux/gdb.md` 对应的网址是 `/linux/gdb`，网址里没有 `zh`。

## 写一篇新文章

在对应栏目目录下新建 `.md` 文件即可，**不需要修改任何配置**，侧边栏会自动更新。

```markdown
---
order: 4
---

# 文章标题

正文……
```

frontmatter 里可用的字段：

| 字段 | 作用 | 不写时 |
| --- | --- | --- |
| `order` | 侧边栏排序，数字越小越靠前 | 排在最后 |
| `title` | 侧边栏和浏览器标签页上显示的标题 | 使用正文的一级标题 |
| `sidebar_exclude: true` | 不在侧边栏中显示，页面仍然可以访问 | 显示 |

> [!NOTE]
> 隐藏文章要用 `sidebar_exclude`，不要用 `sidebar: false`。后者是 VitePress 自带的字段，作用是隐藏这一页的整个侧边栏。

`npm run docs:dev` 运行期间，新增或删除文章、修改 frontmatter 或一级标题后，开发服务器会自动重启，侧边栏随之更新。

### 分组

需要分组时，在栏目下建子目录，并放一个 `index.md`，它的一级标题就是组名，`order` 决定这个组在侧边栏里的位置。注意子目录会体现在网址里，例如 `/linux/debug/gdb`。

## 新增一个栏目

1. 新建目录 `docs/zh/<栏目>/`，里面放一个 `index.md`。它的一级标题就是侧边栏顶部的栏目名。
2. 在首页 `docs/zh/index.md` 的 `features` 里加一张卡片：

```yaml
features:
  - icon: tabler:drone       # Iconify 图标名
    title: FPV 穿越机
    details: 机架组装、飞控调参、图传与飞行笔记。
    link: /fpv/
    # color: violet          # 可选，不写则按卡片顺序自动分配
```

### 卡片图标

图标写成 `图标集:图标名` 的形式，构建时会替换成内联 SVG，颜色跟随卡片的栏目色。

- 在 [Tabler 图标集](https://icon-sets.iconify.design/tabler/) 里挑选，复制图标名即可，如 `tabler:terminal-2`。
- 想用其他图标集，先安装对应的离线包，例如 `npm i -D @iconify-json/mdi`，然后写 `mdi:xxx`。
- 图标名写错时，构建会直接报错并提示原因。

### 卡片颜色

颜色按卡片顺序从色板里依次分配，超过 8 张会循环：

`green` → `rose` → `cyan` → `violet` → `blue` → `amber` → `pink` → `teal`

在卡片上写 `color: <色板名>` 可以手动指定。扩充色板需要改两处：

1. `.vitepress/theme/style.css`：在 `:root`（浅色）和 `.dark`（深色）里各加一对 `--c-<名字>` / `--c-<名字>-soft` 变量，再加一条 `[data-color='<名字>']` 规则。
2. `.vitepress/icons.ts`：把名字加进 `PALETTE`。

## 样式

所有颜色都定义在 `.vitepress/theme/style.css` 里，浅色在 `:root`，深色在 `.dark`。

- 主色是琥珀橙，修改 `--vp-c-brand-*` 即可整体换色。
- logo 有浅色和深色两个版本：`docs/public/logo-light.svg` 和 `logo-dark.svg`。
- 等宽字体 JetBrains Mono 通过 `@fontsource-variable/jetbrains-mono` 打包进站点，不依赖 Google Fonts。

## 文章里常用的写法

```markdown
::: tip
提示
:::

::: warning
警告
:::

::: danger
危险
:::

::: details 点击展开
折叠内容
:::
```

更多 Markdown 扩展见 [VitePress 文档](https://vitepress.dev/zh/guide/markdown)。
