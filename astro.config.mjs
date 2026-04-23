import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { remarkMermaid } from './plugins/remarkMermaid.js';

export default defineConfig({
  site: 'https://stars-labs.github.io',
  base: '/full-it-infra-design-docs',
  integrations: [
    starlight({
      title: 'Stars Labs IT 基础架构设计文档',
      description: '全面的企业IT基础设施规划与实施方案',
      favicon: '/img/favicon.png',
      logo: {
        src: './public/img/logo.svg',
        replacesTitle: false,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/stars-labs/full-it-infra-design-docs',
        },
      ],
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
      },
      sidebar: [
        { label: '项目简介', link: '/' },
        {
          label: '核心设计',
          autogenerate: { directory: '01-core-design' },
        },
        {
          label: '硬件选型',
          autogenerate: { directory: '02-hardware' },
        },
        {
          label: '系统架构',
          autogenerate: { directory: '03-architecture' },
        },
        {
          label: '治理规范',
          autogenerate: { directory: '04-governance' },
        },
        {
          label: '运维操作',
          autogenerate: { directory: '05-operations' },
        },
        {
          label: '其他文档',
          items: [
            { label: '贡献指南', link: '/contribution-guide' },
            { label: '文件系统选型', link: '/filesystem-selection' },
            { label: 'NixOS 数据中心部署', link: '/nixos-datacenter-deployment' },
            { label: '对象存储 vs 直传', link: '/object-storage-vs-direct-transfer' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
            const init = () => {
              const dark = document.documentElement.dataset.theme === 'dark';
              mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'neutral' });
            };
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', init);
            } else {
              init();
            }
            document.addEventListener('astro:after-swap', init);
          `,
        },
      ],
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
});
