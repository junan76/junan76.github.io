// 首页 feature 图标：frontmatter 里写 `icon: tabler:drone` 这样的 Iconify 图标名，
// 构建时替换成内联 SVG。图标集需要先安装对应的离线包，例如 @iconify-json/tabler。
// 图标浏览：https://icon-sets.iconify.design/
import { createRequire } from 'node:module'
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'
import type { PageData } from 'vitepress'

const require = createRequire(import.meta.url)
const collections = new Map<string, IconifyJSON>()

const ICON_NAME_RE = /^([a-z0-9-]+):([a-z0-9-]+)$/

function loadCollection(prefix: string): IconifyJSON {
  let collection = collections.get(prefix)
  if (!collection) {
    try {
      collection = require(`@iconify-json/${prefix}/icons.json`) as IconifyJSON
    } catch {
      throw new Error(`[icons] 找不到图标集 "${prefix}"，请先安装：npm i -D @iconify-json/${prefix}`)
    }
    collections.set(prefix, collection)
  }
  return collection
}

/** 把 `prefix:name` 渲染成 SVG 字符串，图标颜色跟随 currentColor */
export function renderIcon(icon: string, size = 24): string {
  const match = ICON_NAME_RE.exec(icon)
  if (!match) throw new Error(`[icons] 图标名格式应为 "prefix:name"，实际是 "${icon}"`)
  const [, prefix, name] = match
  const data = getIconData(loadCollection(prefix), name)
  if (!data) throw new Error(`[icons] 图标集 "${prefix}" 里没有 "${name}"`)
  const { attributes, body } = iconToSVG(data, { height: size })
  return iconToHTML(replaceIDs(body), attributes)
}

/** 卡片色板，顺序就是自动分配的顺序。颜色值定义在 theme/style.css 里 */
export const PALETTE = ['green', 'rose', 'cyan', 'violet', 'blue', 'amber', 'pink', 'teal']

/**
 * 在 transformPageData 里调用：把首页 features 的图标名替换成 SVG，并分配卡片颜色。
 * - 已经是 SVG 字符串的图标保持不变；对象形式（{ src }）的图标是 <img>，无法染色
 * - 颜色按卡片顺序从 PALETTE 循环取；feature 上写了 `color` 就用指定的
 */
export function resolveFeatureIcons(pageData: PageData) {
  const features = pageData.frontmatter.features
  if (!Array.isArray(features)) return
  features.forEach((feature, i) => {
    if (typeof feature.icon === 'string' && ICON_NAME_RE.test(feature.icon)) {
      feature.icon = renderIcon(feature.icon)
    }
    const color = feature.color ?? PALETTE[i % PALETTE.length]
    if (feature.color && !PALETTE.includes(feature.color)) {
      throw new Error(`[icons] 未知的卡片颜色 "${feature.color}"，可选：${PALETTE.join(' / ')}`)
    }
    if (typeof feature.icon === 'string') {
      // 颜色标记挂在 svg 上，CSS 用 :has() 向上作用到整张卡片
      feature.icon = feature.icon.replace('<svg', `<svg data-color="${color}"`)
    }
  })
}
