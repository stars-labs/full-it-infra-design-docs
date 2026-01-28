import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            查看项目简介 - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({title, description, link, linkText}: {title: string; description: string; link: string; linkText: string}) {
  return (
    <div className={clsx('card', styles.featureCard)}>
      <div className="card__body">
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p>{description}</p>
      </div>
      <div className="card__footer">
        <Link className="button button--primary button--sm" to={link}>
          {linkText}
        </Link>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Stars Labs IT 基础架构设计"
      description="全面的企业IT基础设施规划与实施方案">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <Heading as="h2" className={styles.sectionTitle}>文档导航</Heading>
            <div className={styles.grid}>
              <FeatureCard
                title="IT 基础架构设计"
                description="身份认证、设备管理、自动化运维与企业资源管理整体架构方案。"
                link="/docs/core-design/it-infra-design"
                linkText="查看详情"
              />
              <FeatureCard
                title="交换机选型"
                description="核心交换机、汇聚交换机、接入交换机的选型与配置方案。"
                link="/docs/hardware/switch-selection"
                linkText="查看详情"
              />
              <FeatureCard
                title="网络架构设计"
                description="三层网络架构设计，包括VLAN划分、IP规划与路由策略。"
                link="/docs/architecture/network-architecture"
                linkText="查看详情"
              />
              <FeatureCard
                title="服务器选型"
                description="物理服务器与虚拟化平台的选型建议与配置方案。"
                link="/docs/hardware/server-selection"
                linkText="查看详情"
              />
              <FeatureCard
                title="存储方案"
                description="企业级存储解决方案，包括SAN、NAS与备份容灾策略。"
                link="/docs/architecture/storage-solution"
                linkText="查看详情"
              />
              <FeatureCard
                title="安全架构"
                description="网络安全、主机安全、应用安全与数据安全的整体防护方案。"
                link="/docs/architecture/security-architecture"
                linkText="查看详情"
              />
              <FeatureCard
                title="机房基础设施"
                description="机房布局、机柜规划、UPS、空调与消防系统设计。"
                link="/docs/hardware/datacenter-infra"
                linkText="查看详情"
              />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
