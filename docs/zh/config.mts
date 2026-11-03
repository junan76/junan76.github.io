import { defineAdditionalConfig, type MarkdownLocaleOptions } from "vitepress";
import { sidebarForLocale } from "../../.vitepress/sidebar.ts";

export const markdown: MarkdownLocaleOptions = {
    container: {
        tipLabel: '提示',
        infoLabel: '信息',
        warningLabel: '警告',
        dangerLabel: '危险',
        detailsLabel: '详细信息',
        noteLabel: '注意',
        importantLabel: '重要',
        cautionLabel: '小心'
    },
    codeCopyButton: {
        tooltipText: '复制代码',
        copiedText: '已复制'
    }
}

export default defineAdditionalConfig({

    description: "计算机",

    themeConfig: {
        // 按 docs/zh/ 下的栏目目录自动生成，规则见 .vitepress/sidebar.ts
        sidebar: sidebarForLocale('zh'),

        // editLink: {
        //     pattern: 'https://github.com/junan76/junan76.github.io/edit/main/docs/:path',
        //     text: '在 GitHub 上编辑此页面'
        // },

        footer: {
            message: '基于 MIT 许可发布',
            copyright: '版权所有 © 2019-至今 junan'
        },

        docFooter: {
            prev: '上一页',
            next: '下一页'
        },

        outline: {
            label: '页面导航'
        },

        lastUpdated: {
            text: '最后更新于'
        },

        notFound: {
            title: '页面未找到',
            quote:
                '但如果你不改变方向，并且继续寻找，你可能最终会到达你所前往的地方。',
            linkLabel: '前往首页',
            linkText: '带我回首页'
        },

        langMenuLabel: '多语言',
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        skipToContentLabel: '跳转到内容'
    }
})
