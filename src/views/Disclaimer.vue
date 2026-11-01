<!-- 免责声明：项目性质、内容来源、版权与责任边界 -->
<script setup>
import { useRouter } from 'vue-router'
import Icon from '../components/ui/Icon.vue'

const router = useRouter()

const sections = [
  {
    title: '项目性质',
    items: [
      'StarVid 是作者在学习 Vue 3 的过程中编写的个人练习项目，用于熟悉 Vue 3 + Vite + Vue Router + Pinia 的工程实践，不是商业产品，也不提供任何付费、会员或增值服务。',
      '项目仍在学习性迭代中，不保证稳定性、持续可用性或后续维护，功能与数据源都可能随时调整或移除。',
    ],
  },
  {
    title: '内容来源',
    items: [
      '本项目不存储、不制作、不转码、不上传任何视频文件，也不架设视频服务器，站内不存在任何自有片源。',
      '影片信息、海报与播放地址均来自互联网上公开的第三方采集接口及豆瓣公开数据；播放时由浏览器直接向第三方服务器取流。',
      '本项目仅提供接口聚合、去重与播放器呈现能力，所有内容的合法性、准确性与可用性均由对应数据源负责。',
    ],
  },
  {
    title: '版权声明',
    items: [
      '影片、剧集、海报、简介等内容的著作权及相关权利归原权利人所有，本项目不对其主张任何权利，也不从中获取任何收益。',
      '若权利人认为某项内容侵犯其合法权益，请通过下方邮箱联系，并附上权属证明与具体页面或资源标识；核实后将在 48 小时内移除对应条目。',
    ],
  },
  {
    title: '使用限制',
    items: [
      '本项目仅供个人学习、研究与技术交流使用。',
      '不得将本项目或其部署实例用于商业用途、付费服务、流量变现或任何形式的公开推广。',
      '不得公开分享部署地址，不得搭建面向不特定公众的公开服务。',
      '不得利用本项目从事任何违反所在国家或地区法律法规的活动。',
    ],
  },
  {
    title: '责任免除',
    items: [
      '第三方接口可能随时失效、变更或返回不适宜内容，本项目对此不作任何明示或默示的保证。',
      '因使用或无法使用本项目而产生的任何直接或间接损失（包括但不限于数据丢失、设备损坏、法律纠纷），作者不承担任何责任。',
      '用户应自行判断并承担全部使用风险，并自行确保使用行为符合当地法律法规；因使用行为引发的法律责任由用户自行承担。',
    ],
  },
  {
    title: '隐私与数据',
    items: [
      '本项目没有后端服务，也没有账号体系，不收集、不上传任何个人信息。',
      '播放记录、收藏与设置项仅保存在当前浏览器的 localStorage 中，清除浏览器数据即被删除。',
      '豆瓣数据与海报图片会按你的设置经第三方代理转发，该代理的隐私政策与可用性由代理提供方负责。',
    ],
  },
  {
    title: '未成年人',
    items: [
      '站内内容来自第三方接口，可能包含不适合未成年人观看的信息，建议在监护人指导下使用。',
    ],
  },
  {
    title: '变更与联系',
    items: [
      '本声明可能随项目迭代调整，调整后直接更新于本页面，不另行通知。',
      '对本声明有疑问，或需要处理侵权、违规内容，请通过下方邮箱联系作者。',
    ],
  },
]

const EMAIL = 'wanwanhuigui@gmail.com'
</script>

<template>
  <div class="doc">
    <header class="doc-head">
      <div class="doc-badge">Vue 学习项目 · 非商业用途</div>
      <h1>免责声明</h1>
      <p class="doc-sub">
        StarVid 是一个用于学习 Vue 3 的技术练习项目，仅做公开接口的聚合与播放，不提供、不存储任何视频内容。
      </p>
    </header>

    <div class="doc-notice">
      <Icon name="alert" :size="18" class="notice-icon" />
      <p>
        继续访问或使用本站，即视为你已阅读、理解并同意本页全部内容。如不同意，请立即关闭页面并停止使用。
      </p>
    </div>

    <div class="doc-body">
      <section v-for="(sec, i) in sections" :key="sec.title" class="doc-card">
        <h2>
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
          {{ sec.title }}
        </h2>
        <ul>
          <li v-for="(item, j) in sec.items" :key="j">{{ item }}</li>
        </ul>
      </section>
    </div>

    <section class="doc-contact">
      <div class="contact-copy">
        <h3>侵权处理与联系</h3>
        <p>如需下架内容、反馈问题或技术交流，请发送邮件说明具体条目。</p>
      </div>
      <a class="ui-btn primary contact-mail" :href="`mailto:${EMAIL}`">
        <Icon name="mail" :size="15" />
        <span>{{ EMAIL }}</span>
      </a>
    </section>

    <div class="doc-actions">
      <button class="ui-btn" @click="router.back()">
        <Icon name="arrow-left" :size="14" />
        <span>返回上一页</span>
      </button>
      <button class="ui-btn primary" @click="router.push('/')">
        <Icon name="house" :size="14" />
        <span>回到首页</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.doc {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

.doc-head {
  text-align: center;

  h1 {
    margin: 14px 0 10px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 1px;
  }
}

.doc-badge {
  display: inline-block;
  padding: 5px 12px;
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}

.doc-sub {
  margin: 0 auto;
  max-width: 560px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-secondary);
}

.doc-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 24px 0 20px;
  padding: 14px 16px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  border-left-width: 3px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);

  .notice-icon {
    color: #f59e0b;
    margin-top: 2px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text);
  }
}

.doc-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-card {
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }

  .idx {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  li {
    margin: 6px 0;
    font-size: 13.5px;
    line-height: 1.8;
    color: var(--text-secondary);

    &::marker {
      color: var(--primary);
    }
  }
}

.doc-contact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--primary-soft);

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-secondary);
  }
}

.contact-mail {
  height: 36px;
  font-size: 13px;
}

.doc-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

@media (max-width: 767px) {
  .doc {
    padding: 20px 14px 40px;
  }

  .doc-head h1 {
    font-size: 23px;
  }

  .doc-contact {
    flex-direction: column;
    align-items: stretch;
  }

  .contact-mail {
    justify-content: center;
  }
}
</style>
