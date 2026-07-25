// 路由配置：History 模式 + 懒加载 + 滚动回顶
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, left: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/Search.vue'),
      meta: { title: '搜索' },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('../views/Favorites.vue'),
      meta: { title: '收藏夹' },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/History.vue'),
      meta: { title: '观看历史' },
    },
    {
      path: '/play',
      name: 'play',
      component: () => import('../views/Play.vue'),
      meta: { title: '播放' },
    },
    {
      path: '/douban',
      name: 'douban',
      component: () => import('../views/Douban.vue'),
      meta: { title: '豆瓣' },
    },
  ],
})

export default router
