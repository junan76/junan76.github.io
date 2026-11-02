import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { markdown as zhMarkdown } from '../docs/zh/config.mts'
import { resolveFeatureIcons } from './icons.ts'
import { sidebarReloadPlugin } from './sidebar.ts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "docs",

  title: "Madrio",

  rewrites: {
    "zh/:rest*": ":rest*"
  },

  lastUpdated: true,
  cleanUrls: true,

  // 首页 features 的 `icon: tabler:xxx` 替换成 SVG，见 ./icons.ts
  transformPageData(pageData) {
    resolveFeatureIcons(pageData)
  },

  vite: {
    // 新增、删除文章或修改 frontmatter 时重新生成侧边栏，见 ./sidebar.ts
    plugins: [sidebarReloadPlugin(fileURLToPath(import.meta.url))]
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: "local"
    },

    logo: {
      light: "/logo-light.svg", dark: "/logo-dark.svg", width: 24, height: 24
    },

    socialLinks: [
      { icon: 'github', link: "https://github.com/junan76" },
      { icon: 'bilibili', link: "https://space.bilibili.com/258537970" }
    ]
  },

  locales: {
    root: { label: "简体中文", lang: "zh-Hans", dir: "ltr", markdown: zhMarkdown },
    // en: { label: "English", lang: "en-US", dir: "ltr" },
  }
})
