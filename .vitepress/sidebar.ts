// 侧边栏：用 vitepress-sidebar 按目录自动生成，不需要手动维护。
//
// - docs/<语言>/ 下的每个子目录是一个栏目，各自一套侧边栏
// - 栏目名取自该目录 index.md 的 frontmatter `title`，没有就取一级标题
// - 文章标题同样优先取 frontmatter `title`，其次取一级标题
// - 文章排序用 frontmatter `order`（数字越小越靠前），没写的排在最后
// - frontmatter 写 `sidebar_exclude: true` 的文章不出现在侧边栏里
//   （不用 `sidebar: false`，那是 VitePress 用来隐藏整页侧边栏的字段）
// - 栏目下的子目录会变成一个分组，分组名取自子目录的 index.md
import fs from 'node:fs'
import path from 'node:path'
import { generateSidebar } from 'vitepress-sidebar'
import type { DefaultTheme, Plugin } from 'vitepress'

const DOCS_DIR = path.resolve(import.meta.dirname, '../docs')

/** 读取 markdown 的标题：frontmatter title 优先，其次是第一个一级标题 */
function readTitle(file: string): string | undefined {
  const src = fs.readFileSync(file, 'utf-8')
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)?.[1]
  const fmTitle = fm && /^title:\s*['"]?(.+?)['"]?\s*$/m.exec(fm)?.[1]
  return fmTitle || /^#\s+(.+)$/m.exec(src)?.[1]?.trim()
}

/**
 * 生成某个语言目录下所有栏目的侧边栏。
 * @param localeDir docs 下的语言目录，例如 'zh'
 * @param urlPrefix 该语言在网址里的前缀。zh 通过 rewrites 映射到了根路径，所以是 ''
 */
export function sidebarForLocale(localeDir: string, urlPrefix = ''): DefaultTheme.SidebarMulti {
  const root = path.join(DOCS_DIR, localeDir)
  const sections = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'index.md')))
    .map((d) => d.name)

  return generateSidebar(
    sections.map((dir) => {
      const base = `${urlPrefix}/${dir}/`
      return {
        documentRootPath: 'docs',
        scanStartPath: `${localeDir}/${dir}`,
        resolvePath: base,
        basePath: base,
        rootGroupText: readTitle(path.join(root, dir, 'index.md')) ?? dir,
        rootGroupLink: base,
        useTitleFromFrontmatter: true,
        useTitleFromFileHeading: true,
        useFolderTitleFromIndexFile: true,
        useFolderLinkFromIndexFile: true,
        sortMenusByFrontmatterOrder: true,
        frontmatterOrderDefaultValue: 9999,
        excludeFilesByFrontmatterFieldName: 'sidebar_exclude'
      }
    })
  ) as DefaultTheme.SidebarMulti
}

/**
 * 侧边栏只在加载配置时生成一次。dev 模式下新增、删除文章，
 * 或者修改了 frontmatter / 标题时，touch 一下配置文件让 VitePress 重启，
 * 侧边栏就会重新生成。
 */
export function sidebarReloadPlugin(configFile: string): Plugin {
  // 每个文件影响侧边栏的部分：frontmatter + 一级标题
  const signatures = new Map<string, string>()
  const signatureOf = (file: string) => {
    try {
      const src = fs.readFileSync(file, 'utf-8')
      const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(src)?.[0] ?? ''
      const h1 = /^#\s+.+$/m.exec(src)?.[0] ?? ''
      return fm + '\n' + h1
    } catch {
      return ''
    }
  }
  const isDoc = (file: string) => file.startsWith(DOCS_DIR) && file.endsWith('.md')
  const touchConfig = () => {
    const now = new Date()
    fs.utimesSync(configFile, now, now)
  }

  return {
    name: 'blog:sidebar-reload',
    apply: 'serve',
    configureServer(server) {
      server.watcher.on('add', (file) => {
        if (!isDoc(file)) return
        signatures.set(file, signatureOf(file))
        touchConfig()
      })
      server.watcher.on('unlink', (file) => {
        if (!isDoc(file)) return
        signatures.delete(file)
        touchConfig()
      })
      server.watcher.on('change', (file) => {
        if (!isDoc(file)) return
        const sig = signatureOf(file)
        const prev = signatures.get(file)
        signatures.set(file, sig)
        if (prev !== undefined && prev !== sig) touchConfig()
      })
    },
    buildStart() {
      // 记录启动时每篇文章的状态，之后只在相关部分变化时才重启
      const walk = (dir: string) => {
        for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, d.name)
          if (d.isDirectory()) walk(p)
          else if (isDoc(p)) signatures.set(p, signatureOf(p))
        }
      }
      walk(DOCS_DIR)
    }
  }
}
