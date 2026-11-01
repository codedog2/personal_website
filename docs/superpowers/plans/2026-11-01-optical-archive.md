# Optical Archive 个人网站 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个部署在 GitHub Pages 的静态个人作品集网站：桌面端是可交互的 three.js 胶片阅读机，手机端和不支持 3D 的设备是同风格的 2D 版，支持中英日三语。

**Architecture:** Vite 打包的原生 JS 单页应用。共享层（偏好、i18n、内容数据、各栏目的 HTML 渲染器）同时服务 3D 版和 2D 版；3D 版把栏目渲染进一个贴合 3D 屏幕位置的 HTML 层。所有能脱离 WebGL 的逻辑（胶片物理、推近计算、阅读状态机、视图选择、开场时间表）写成纯函数并单测；3D 外观用浏览器目测验证。

**Tech Stack:** Vite 6、three.js 0.170（npm 包 `three@0.170.0`）、Vitest 2 + jsdom、@gltf-transform（只在模型预处理脚本里用）、GitHub Actions + GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-11-01-optical-archive-design.md`（下文简称"设计文档"，§ 指它的章节）。参考实现：`spike/`（只参考，不复制粘贴整块代码）。

## Global Constraints

- 栏目固定 4 个，顺序：`about → projects → skills → certificates`；首页停在 About。不做 Experience、Resume。
- 语言：`en`、`zh`、`ja`；任何文字缺某语言时回退到 `en`，界面上不能出现空白、`undefined` 或键名。
- 默认语言：已保存的选择 > 浏览器语言（`zh*`→zh，`ja*`→ja）> `en`。
- 屏幕推近后，屏幕边框宽度占画面宽度 **0.75**（`SCREEN_COVER`，放在 `src/config.js`，可调），且高度不超过画面高度的 0.9。
- 返回方式三种都要：Esc、屏幕下方居中的小按钮 `◀ BACK` + `ESC` 键帽、点击屏幕外区域。
- 声音默认关闭。
- 开场过场首次访问 4–6 秒，可跳过；看过的访客缩短（≤1.8 秒）。
- 场景里**不要**：放映机机身、显微镜、仪器面板、读片口上方的镜头/立柱、拉杆、旋钮后面的盒子。
- 3D 模型只用 CC0（Poly Haven），授权写进 `public/models/LICENSE.md`。
- 纯静态：无后端、无统计、无登录。部署路径由环境变量 `BASE_PATH` 决定（默认 `/`）。
- 色值：背景 `#0b0806`，强调琥珀 `#ffb35c`，纸面 `#efe3c6`，纸面文字 `#2d2117`。字体：Cormorant Garamond（标题/英文正文）、IBM Plex Mono（标签/数字）、Noto Serif SC / Noto Serif JP（中/日）。
- 每次提交的 commit message 末尾加：`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **浏览器存储不可用**（隐私模式、禁用 cookie）：读写偏好不能抛错，网站照常用默认值运行。→ Task 2 测试 `prefs survive a throwing localStorage`。
2. **过渡动画中的乱输入**（连按 Enter、载入中按 Esc、阅读时滚轮/方向键、退出中点旋钮）：全部忽略，状态机永远不会卡住。→ Task 8 测试 `reader machine ignores events outside their state`。
3. **数据缺项**（缺 zh/ja 文案、项目没有图片或链接、证书没有链接、技术栈引用了不存在的技能）：回退英文或省略该元素，不出现 `undefined`。→ Task 3、4、5 的测试。
4. **阅读时改变窗口尺寸或奇怪比例**（4:3 窄窗口、21:9 超宽）：屏幕仍完整可见、高度 ≤90%，HTML 层重新对齐。→ Task 8 测试 `zoomDistance caps height on narrow aspect`；Task 10 目测步骤。
5. **3D 运行时失败**（WebGL 创建失败、模型 404）：自动退回 2D 版，不能黑屏。→ Task 6 测试 `mountView falls back to 2d when 3d mount rejects`。

---

## 文件结构

```
index.html                     入口页（画布、UI 外壳、字体）
vite.config.js                 base 取自 BASE_PATH；vitest 用 jsdom
package.json
.github/workflows/deploy.yml   测试 + 打包 + 发布 Pages
public/
  models/reel.glb tv.glb lamp.glb LICENSE.md   预处理后的 CC0 模型
  images/*.svg                 占位图（照片、项目缩略图）
scripts/prepare-models.mjs     下载 Poly Haven 模型、抽取片盘、压缩
src/
  main.js                      启动：语言、视图选择、开场、挂载
  config.js                    所有可调参数（镜头、位置、比例、时长）
  content/content.json         全部内容（三语占位）
  content/strings.json         界面文字键值表
  core/prefs.js                安全的 localStorage 读写
  core/i18n.js                 语言检测/切换、t()、pick()
  core/content.js              栏目列表、内容读取与校验、资源路径
  core/mode.js                 选择 3D/2D、WebGL 检测、mountView 回退
  core/sound.js                WebAudio 合成音效
  sections/note.js             注释卡弹层（Skills、Projects 技术栈、证书共用）
  sections/about.js projects.js skills.js certificates.js index.js
  intro/intro.js               开场过场
  flat/flat2d.js               2D 版
  scene/filmPhysics.js         纯函数：胶片惯性、吸附、回弹
  scene/zoom.js                纯函数：推近距离、载入/退出时间线
  scene/readerMachine.js       纯函数：idle/loading/zoomed/unloading 状态机
  scene/stage.js               渲染器、后期（泛光、颗粒、暗角、屏外压暗虚化）
  scene/textures.js            程序贴图（磨损、木纹、窗、胶片帧画、表盘）
  scene/models.js              加载 glb + 统一调色
  scene/machine.js             台面、卷片盘、读片口、屏幕、旋钮、台灯、灰尘
  scene/film.js                胶片帧网格与姿态
  scene/scene3d.js             3D 版总装：输入、循环、载入/退出、HTML 层贴合
  styles/base.css paper.css intro.css chrome.css flat.css
tests/                         与 src 对应的 *.test.js
```

## 内容数据格式（多个任务共用）

`LocalText` = 字符串，或 `{ "en": "...", "zh": "...", "ja": "..." }`（只有 `en` 必填）。

```json
{
  "profile": {
    "name": "Terry (Yaowei) Feng",
    "role": LocalText,
    "bio": [LocalText],
    "photo": "images/portrait.svg",
    "contacts": [{ "kind": "email|github|linkedin|other", "label": "EMAIL", "value": "name@example.com", "href": "mailto:name@example.com" }],
    "education": [LocalText],
    "interests": LocalText
  },
  "projects": [{ "code": "P-01", "name": LocalText, "summary": LocalText, "overview": LocalText,
                 "image": "images/p01.svg" | null, "stack": ["python", "json"],
                 "links": { "github": "url" | null, "demo": "url" | null } }],
  "skills": [{ "group": "LANGUAGES", "items": [{ "id": "python", "name": "Python", "level": 4, "years": LocalText, "note": LocalText }] }],
  "certificates": [{ "name": LocalText, "icon": "☁", "status": "earned|in-progress", "issuer": LocalText,
                     "date": "2025-06", "credentialId": "..." | null, "url": "..." | null }]
}
```

---

### Task 1: 项目骨架与自动部署

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`（暂时只挂一个空壳）, `src/styles/base.css`, `.github/workflows/deploy.yml`, `.gitignore`, `tests/config.test.js`, `src/config.js`
- Modify: `.claude/launch.json`（加一个 `dev` 配置：`npm run dev`，端口 5173）

**Interfaces:**
- Produces: `src/config.js` 导出 `CONFIG`（冻结对象，后续任务往里加字段）和 `basePath(env: Record<string,string>): string`。

- [ ] **Step 1: 初始化仓库**

```bash
git init -b main
```

`.gitignore`：`node_modules/`、`dist/`、`.superpowers/`、`.claude/`、`spike/models/`。

- [ ] **Step 2: 写失败的测试** `tests/config.test.js`

```js
import { basePath, CONFIG } from '../src/config.js';
test('basePath defaults to root and normalises slashes', () => {
  expect(basePath({})).toBe('/');
  expect(basePath({ BASE_PATH: 'portfolio' })).toBe('/portfolio/');
  expect(basePath({ BASE_PATH: '/portfolio/' })).toBe('/portfolio/');
});
test('screen cover is 0.75', () => { expect(CONFIG.SCREEN_COVER).toBe(0.75); });
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run tests/config.test.js` → FAIL（模块不存在）

- [ ] **Step 4: 实现**
  - `package.json` scripts：`dev`=`vite`、`build`=`vite build`、`test`=`vitest run`、`models`=`node scripts/prepare-models.mjs`；依赖 `three@0.170.0`；开发依赖 `vite@^6`、`vitest@^2`、`jsdom@^25`。
  - `vite.config.js`：`base: basePath(process.env)`，`test: { environment: 'jsdom' }`。
  - `src/config.js`：`CONFIG = Object.freeze({ SCREEN_COVER: 0.75, MAX_HEIGHT_COVER: 0.9 })` 和 `basePath`。
  - `index.html`：`<canvas id="gl">`、`<div id="app">`、Google Fonts（Cormorant Garamond 500/600 + italic、IBM Plex Mono 400/500、Noto Serif SC 400/600、Noto Serif JP 400/600）、`<title>Optical Archive · Terry (Yaowei) Feng</title>`。
  - `src/styles/base.css`：`:root` 写入 Global Constraints 里的色值为 CSS 变量，`body` 背景 `#0b0806`。
  - `deploy.yml`：push 到 `main` 时触发；`actions/checkout@v4` → `actions/setup-node@v4`（node 22）→ `npm ci` → `npm test` → `npm run build`（`BASE_PATH: ${{ vars.BASE_PATH || '/' }}`）→ `actions/upload-pages-artifact@v3`（`dist`）→ `actions/deploy-pages@v4`；权限 `pages: write`、`id-token: write`。

- [ ] **Step 5: 跑测试与构建**

Run: `npm install && npm test && npm run build` → 测试 PASS，`dist/index.html` 存在。

- [ ] **Step 6: 提交**（连同设计文档、计划、`spike/` 代码一起）

```bash
git add -A
git commit -m "chore: scaffold Vite site with Pages deploy workflow"
```

---

### Task 2: 偏好存储与多语言

**Files:**
- Create: `src/core/prefs.js`, `src/core/i18n.js`, `src/content/strings.json`, `tests/prefs.test.js`, `tests/i18n.test.js`

**Interfaces:**
- Produces:
  - `readPref(key: 'lang'|'view'|'introSeen', fallback: any): any`、`writePref(key, value): void`（键名加前缀 `oa:`，JSON 序列化，任何异常都吞掉）
  - `LANGS = ['en','zh','ja']`
  - `detectLang(languages: string[]): 'en'|'zh'|'ja'`
  - `initLang(): string`、`getLang(): string`、`setLang(lang: string): void`（写偏好并通知）、`onLangChange(fn: (lang)=>void): () => void`（返回取消函数）
  - `t(key: string, lang?: string): string`
  - `pick(text: string | {en:string, zh?:string, ja?:string} | null | undefined, lang?: string): string`

- [ ] **Step 1: 写失败的测试**

```js
// tests/prefs.test.js
test('prefs round-trip', () => { writePref('lang', 'ja'); expect(readPref('lang', 'en')).toBe('ja'); });
test('prefs survive a throwing localStorage', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => writePref('view', '2d')).not.toThrow();
  expect(readPref('view', '3d')).toBe('3d');
  spy.mockRestore();
});
// tests/i18n.test.js
test('detectLang', () => {
  expect(detectLang(['zh-CN'])).toBe('zh'); expect(detectLang(['ja-JP', 'en'])).toBe('ja');
  expect(detectLang(['fr-FR'])).toBe('en'); expect(detectLang([])).toBe('en');
});
test('saved language wins over browser language', () => { writePref('lang', 'zh'); expect(initLang()).toBe('zh'); });
test('pick falls back to english, never undefined', () => {
  expect(pick({ en: 'Hi', zh: '你好' }, 'zh')).toBe('你好');
  expect(pick({ en: 'Hi' }, 'ja')).toBe('Hi');
  expect(pick('plain', 'ja')).toBe('plain');
  expect(pick(undefined, 'zh')).toBe('');
});
test('t falls back to english, then to empty string', () => {
  expect(t('nav.about', 'ja')).toBeTruthy();
  expect(t('no.such.key', 'zh')).toBe('');
});
test('setLang notifies and persists', () => {
  const fn = vi.fn(); const off = onLangChange(fn);
  setLang('ja'); expect(fn).toHaveBeenCalledWith('ja'); expect(readPref('lang')).toBe('ja'); off();
});
test('every string has an english value', () => {
  for (const [k, v] of Object.entries(strings)) expect(v.en, k).toBeTruthy();
});
```

- [ ] **Step 2: 跑测试确认失败** — Run: `npx vitest run tests/prefs.test.js tests/i18n.test.js` → FAIL

- [ ] **Step 3: 实现** `prefs.js`、`i18n.js`、`strings.json`。
  `strings.json` 至少包含这些键（三语都写；zh/ja 可以先写合理译文）：
  `nav.about/projects/skills/certificates`、`section.<id>.title`、`section.<id>.tagline`、`ui.back`（"BACK"）、`ui.esc`、`ui.sound.on/off`、`ui.view.simple`（"Simple View"/"简洁版"/"シンプル表示"）、`ui.view.3d`、`ui.copy`、`ui.copied`、`ui.allProjects`、`ui.overview`、`ui.techStack`、`ui.viewCredential`、`ui.inProgress`、`ui.earned`、`ui.hint.browse`、`ui.hint.load`、`ui.screen.load`（"▶ PRESS ENTER OR TURN THE KNOB TO LOAD"）、`intro.question`（en：`Why should you hire Yaowei (Terry) Feng?`，zh/ja 保留英文名：`你为什么应该录用 Yaowei (Terry) Feng？`、`なぜ Yaowei (Terry) Feng を採用すべきか？`）、`intro.answer`（en：`The answer is in the archive.`）、`intro.skip`、`intro.loading`。
  `t()` 找不到键时 `console.warn` 一次并返回 `''`。

- [ ] **Step 4: 跑测试确认通过** — 同上命令 → PASS

- [ ] **Step 5: 提交** — `git commit -am "feat: prefs storage and i18n with english fallback"`（先 `git add` 新文件）

---

### Task 3: 内容数据与校验

**Files:**
- Create: `src/content/content.json`, `src/core/content.js`, `public/images/portrait.svg`, `public/images/p01.svg`, `p02.svg`, `p03.svg`, `tests/content.test.js`

**Interfaces:**
- Consumes: `pick`, `t`（Task 2）
- Produces:
  - `SECTIONS: ReadonlyArray<{ id: 'about'|'projects'|'skills'|'certificates' }>`（固定顺序）
  - `getContent(): ContentData`（就是 content.json）
  - `validateContent(data): string[]`（返回问题列表，不抛错）
  - `asset(path: string): string`（拼上 `import.meta.env.BASE_URL`）
  - `findSkill(data, id: string): SkillItem | null`

- [ ] **Step 1: 写失败的测试**

```js
test('sections are fixed and ordered', () => {
  expect(SECTIONS.map(s => s.id)).toEqual(['about', 'projects', 'skills', 'certificates']);
});
test('shipped content is valid', () => { expect(validateContent(getContent())).toEqual([]); });
test('validation reports missing english and bad status', () => {
  const bad = structuredClone(getContent());
  bad.projects[0].name = { zh: '只有中文' };
  bad.certificates[0].status = 'done';
  const problems = validateContent(bad);
  expect(problems.some(p => p.includes('projects[0].name'))).toBe(true);
  expect(problems.some(p => p.includes('certificates[0].status'))).toBe(true);
});
test('unknown stack id is reported', () => {
  const bad = structuredClone(getContent()); bad.projects[0].stack.push('cobol');
  expect(validateContent(bad).some(p => p.includes('cobol'))).toBe(true);
});
test('asset prefixes base url', () => { expect(asset('images/p01.svg')).toMatch(/images\/p01\.svg$/); });
```

- [ ] **Step 2: 跑测试确认失败** — `npx vitest run tests/content.test.js` → FAIL

- [ ] **Step 3: 实现** `content.js` 与占位数据。
  占位内容沿用 `spike/content.js` 里的文字（About 简介、教育：Rikkyo University M.A. Social Design / ECUST B.A. Japanese Studies；项目 P-01 Localization Tool、P-02 AWS Learning、P-03 Poké-like RPG；技能四组；证书 3 个已获得 + 2 个准备中），改成上面的数据格式。至少一个项目把 `links.github` 和 `image` 设为 `null`，用来覆盖"缺项"情况。
  占位 SVG：棕褐色渐变底加简单图形（人像剪影、山、齿轮），每个 <2 KB。
  `validateContent` 检查：每个 LocalText 都有 `en`；`status` 只能是两个值；`level` 是 1–5 的整数；`stack` 里每个 id 都能在 skills 里找到。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: placeholder content data with validation"`

---

### Task 4: 栏目渲染（注释卡、About、Projects）与纸面样式

**Files:**
- Create: `src/sections/note.js`, `src/sections/about.js`, `src/sections/projects.js`, `src/styles/paper.css`, `tests/sections-about-projects.test.js`

**Interfaces:**
- Consumes: `getContent`, `findSkill`, `asset`, `pick`, `t`
- Produces:
  - `showNote(host: HTMLElement, anchor: HTMLElement, note: { title: string, meta?: string, body: string }): HTMLElement` — 在 `host` 内、`anchor` 下方插入 `.note`，先移除已有的；`hideNotes(host): void`
  - `renderAbout(host: HTMLElement, ctx: { data: ContentData, lang: string }): void`
  - `renderProjects(host, ctx): void`（内部管理列表/详情切换）
  - 所有渲染器：清空 `host` 后重画；只用 `textContent` 或转义后的字符串写入数据，避免数据里的尖括号变成标签。

- [ ] **Step 1: 写失败的测试**

```js
const ctx = lang => ({ data: getContent(), lang });
test('about shows name, contacts and education', () => {
  const host = document.createElement('div'); renderAbout(host, ctx('en'));
  expect(host.textContent).toContain('Terry (Yaowei) Feng');
  expect(host.querySelectorAll('.contact a').length).toBe(getContent().profile.contacts.length);
  expect(host.querySelector('.card .clip')).not.toBeNull();
});
test('email copy button writes to clipboard and shows copied label', async () => {
  const write = vi.fn().mockResolvedValue(); Object.assign(navigator, { clipboard: { writeText: write } });
  const host = document.createElement('div'); renderAbout(host, ctx('en'));
  host.querySelector('[data-copy]').click(); await Promise.resolve();
  expect(write).toHaveBeenCalledWith('name@example.com');
  expect(host.querySelector('[data-copy]').textContent).toBe(t('ui.copied', 'en'));
});
test('projects list -> detail -> back', () => {
  const host = document.createElement('div'); renderProjects(host, ctx('en'));
  expect(host.querySelectorAll('.pf').length).toBe(3);
  host.querySelectorAll('.pf')[2].click();
  expect(host.querySelector('h2').textContent).toContain('P-03');
  expect(host.querySelectorAll('.tk').length).toBe(getContent().projects[2].stack.length);
  host.querySelector('.linkback').click();
  expect(host.querySelectorAll('.pf').length).toBe(3);
});
test('project without links or image omits them, never prints undefined', () => {
  const host = document.createElement('div'); renderProjects(host, ctx('zh'));
  const i = getContent().projects.findIndex(p => !p.links.github);
  host.querySelectorAll('.pf')[i].click();
  expect(host.querySelector('a[data-link="github"]')).toBeNull();
  expect(host.innerHTML).not.toContain('undefined');
});
test('stack token opens the skill note', () => {
  const host = document.createElement('div'); renderProjects(host, ctx('en'));
  host.querySelectorAll('.pf')[2].click(); host.querySelector('.tk').click();
  expect(host.querySelector('.note')).not.toBeNull();
});
```

- [ ] **Step 2: 跑测试确认失败** — `npx vitest run tests/sections-about-projects.test.js` → FAIL

- [ ] **Step 3: 实现** 两个渲染器、`note.js`、`paper.css`。
  项目列表的胶片条在项目超过 3 个时可以横向滚动，两端显示左右箭头。
  版式与类名沿用 `spike/style.css` / `spike/content.js`（`.cols`、`.card`、`.clip`、`.contact`、`.strip`、`.pf`、`.detail`、`.linkback`、`.tk`、`.note`），尺寸用 `cqw` 单位，宿主元素需 `container-type: inline-size`。中文/日文时正文字体切到 Noto Serif SC/JP（用 `:lang(zh)`、`:lang(ja)`，宿主设置 `lang` 属性）。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: about and projects section renderers"`

---

### Task 5: 栏目渲染（Skills、Certificates）与注册表

**Files:**
- Create: `src/sections/skills.js`, `src/sections/certificates.js`, `src/sections/index.js`, `tests/sections-skills-certs.test.js`
- Modify: `src/styles/paper.css`（技能方框、徽章墙样式）

**Interfaces:**
- Consumes: `showNote`, `hideNotes`, `getContent`, `pick`, `t`
- Produces:
  - `renderSkills(host, ctx)`, `renderCertificates(host, ctx)`
  - `renderSection(host: HTMLElement, id: SectionId, ctx): void` — 设置 `host.lang = ctx.lang` 后分派到对应渲染器
  - `levelBar(level: number): string` — 例如 `4` → `'■■■■□'`

- [ ] **Step 1: 写失败的测试**

```js
test('skills are grouped boxes with notes', () => {
  const host = document.createElement('div'); renderSkills(host, { data: getContent(), lang: 'en' });
  expect(host.querySelectorAll('.grp').length).toBe(getContent().skills.length);
  const tk = host.querySelector('.tk'); tk.click();
  expect(tk.classList.contains('on')).toBe(true);
  expect(host.querySelector('.note').textContent).toContain(levelBar(getContent().skills[0].items[0].level));
  host.click(); expect(host.querySelector('.note')).toBeNull();
});
test('levelBar', () => { expect(levelBar(4)).toBe('■■■■□'); expect(levelBar(9)).toBe('■■■■■'); expect(levelBar(0)).toBe('□□□□□'); });
test('certificates tally and locked badges', () => {
  const host = document.createElement('div'); renderCertificates(host, { data: getContent(), lang: 'en' });
  const certs = getContent().certificates;
  expect(host.querySelector('.tally').textContent).toContain(String(certs.filter(c => c.status === 'earned').length));
  expect(host.querySelectorAll('.badge.locked').length).toBe(certs.filter(c => c.status === 'in-progress').length);
});
test('certificate without url shows no credential link', () => {
  const data = structuredClone(getContent()); data.certificates[0].url = null;
  const host = document.createElement('div'); renderCertificates(host, { data, lang: 'ja' });
  host.querySelector('.badge').click();
  expect(host.querySelector('.note a')).toBeNull();
  expect(host.innerHTML).not.toContain('undefined');
});
test('renderSection dispatches all four ids', () => {
  for (const { id } of SECTIONS) { const h = document.createElement('div'); renderSection(h, id, { data: getContent(), lang: 'zh' }); expect(h.childElementCount).toBeGreaterThan(0); expect(h.lang).toBe('zh'); }
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**。徽章外观照设计文档 §4.7（已获得：黄铜渐变 + 光晕 + 扫光动画 + 悬停转动；准备中：灰、无光、半透明）。技能方框照 §4.7（琥珀描边发光、圆角、等宽字体），样式参考 `spike/style.css` 的 `.tk`、`.medal`。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: skills and certificates renderers"`

---

### Task 6: 视图选择、音效与启动回退

**Files:**
- Create: `src/core/mode.js`, `src/core/sound.js`, `tests/mode.test.js`, `tests/sound.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `readPref`, `writePref`, `initLang`
- Produces:
  - `hasWebGL(): boolean`
  - `chooseView(env: { webgl: boolean, width: number, height: number, coarse: boolean, saved: '3d'|'2d'|null }): '3d'|'2d'`
  - `mountView(view: '3d'|'2d', mounts: { mount3d: () => Promise<void>, mount2d: () => Promise<void> | void }): Promise<'3d'|'2d'>` — 3D 挂载失败时 `console.error` 后调用 2D，并返回实际挂载的视图
  - `switchView(view: '3d'|'2d'): void` — 写偏好并 `location.reload()`
  - `createSound(AudioCtor?: typeof AudioContext): { enabled: boolean, setEnabled(on: boolean): void, tick(): void, clunk(): void, whirr(): void, powerOn(): void }`

- [ ] **Step 1: 写失败的测试**

```js
// tests/mode.test.js
const base = { webgl: true, width: 1440, height: 900, coarse: false, saved: null };
test('desktop gets 3d', () => expect(chooseView(base)).toBe('3d'));
test('no webgl always 2d, even if saved 3d', () => expect(chooseView({ ...base, webgl: false, saved: '3d' })).toBe('2d'));
test('phone gets 2d', () => expect(chooseView({ ...base, width: 390, height: 844, coarse: true })).toBe('2d'));
test('portrait tablet gets 2d, landscape tablet gets 3d', () => {
  expect(chooseView({ ...base, width: 820, height: 1180, coarse: true })).toBe('2d');
  expect(chooseView({ ...base, width: 1180, height: 820, coarse: true })).toBe('3d');
});
test('saved choice wins when webgl works', () => expect(chooseView({ ...base, saved: '2d' })).toBe('2d'));
test('mountView falls back to 2d when 3d mount rejects', async () => {
  const mount2d = vi.fn();
  const got = await mountView('3d', { mount3d: () => Promise.reject(new Error('404 model')), mount2d });
  expect(got).toBe('2d'); expect(mount2d).toHaveBeenCalled();
});
// tests/sound.test.js
test('no AudioContext until enabled; calls are safe while off', () => {
  const Ctor = vi.fn(() => fakeAudioContext());   // fakeAudioContext: 返回带 createBufferSource/createBiquadFilter/createGain/createOscillator/destination/currentTime/sampleRate/createBuffer 的桩
  const s = createSound(Ctor);
  expect(s.enabled).toBe(false); s.tick(); s.clunk(); expect(Ctor).not.toHaveBeenCalled();
  s.setEnabled(true); s.tick(); expect(Ctor).toHaveBeenCalledTimes(1);
  s.setEnabled(false); s.setEnabled(true); expect(Ctor).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**。
  `chooseView` 规则（按顺序）：无 WebGL → 2d；有保存的选择 → 用它；`width < 768` → 2d；`coarse && height > width` → 2d；否则 3d。
  `sound.js` 的四种声音照 `spike/main.js` 的 `noiseBurst`/`thump` 合成（tick：25ms、3200Hz 带通；clunk：60ms 900Hz + 110→40Hz 低音；whirr：10 个间隔 70ms 的短噪声；powerOn：上扬的 60→180Hz 嗡声 0.4s）。声音开关不存偏好（每次访问都默认关）。
  `main.js`：`initLang()` → `chooseView({...})` → `const mounted = mountView(view, { mount3d: () => import('./scene/scene3d.js').then(m => m.mountScene(...)), mount2d: () => import('./flat/flat2d.js').then(m => m.mountFlat(...)) })` → 把 `mounted` 作为开场的 `ready` 传给 `runIntro`（Task 9 之前先直接 `await mounted`）。2D 视图的开场用 `seen: true` 的短时间表。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: view selection with 2d fallback and synthesized sound"`

---

### Task 7: 2D 简洁版

**Files:**
- Create: `src/flat/flat2d.js`, `src/styles/flat.css`, `tests/flat2d.test.js`

**Interfaces:**
- Consumes: `SECTIONS`, `renderSection`, `getContent`, `getLang`/`setLang`/`onLangChange`/`t`, `switchView`, `createSound`
- Produces: `mountFlat(root: HTMLElement, opts: { sound: Sound, switchView: (v) => void }): { goTo(index: number): void, destroy(): void }`

- [ ] **Step 1: 写失败的测试**

```js
const setup = () => { const root = document.createElement('div'); document.body.append(root);
  const switchView = vi.fn(); const api = mountFlat(root, { sound: createSound(vi.fn()), switchView }); return { root, api, switchView }; };
test('nav lists four sections in order, about active first', () => {
  const { root } = setup();
  expect([...root.querySelectorAll('nav [data-section]')].map(a => a.dataset.section)).toEqual(['about', 'projects', 'skills', 'certificates']);
  expect(root.querySelector('nav .on').dataset.section).toBe('about');
  expect(root.querySelector('.counter').textContent).toContain('01 / 04');
});
test('clicking nav, arrow keys and swipe change section and dots', () => {
  const { root } = setup();
  root.querySelector('[data-section="skills"]').click();
  expect(root.querySelector('.dots .on').dataset.i).toBe('2');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(root.querySelector('nav .on').dataset.section).toBe('certificates');
  const panel = root.querySelector('.panel');
  panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 100 }));
  panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 105 }));  // 向左滑 → 下一个；已在最后一个，保持不变
  expect(root.querySelector('nav .on').dataset.section).toBe('certificates');
});
test('language switch re-renders text', () => {
  const { root } = setup();
  root.querySelector('.lang [data-lang="ja"]').click();
  expect(root.querySelector('nav [data-section="about"]').textContent).toBe(t('nav.about', 'ja'));
});
test('3d button asks to switch view', () => {
  const { root, switchView } = setup(); root.querySelector('[data-view="3d"]').click();
  expect(switchView).toHaveBeenCalledWith('3d');
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**。
  版式按设计文档 §4.10 和 `docs/superpowers/specs/assets/2026-11-01-moodboard.webp` 下半部分：顶部左 `Optical Archive` + 名字，右为导航（当前项下划线）；面板左侧是 `01 / 04`、大标题、tagline，右侧是栏目内容放在米黄纸面卡片里；底部翻页圆点；右上角是三档语言拨片（`EN · 中 · 日`，选中的那档高亮，切换时文字闪一下）、声音开关、`3D` 切换按钮。滑动阈值：水平位移 ≥50px 且大于垂直位移。窄屏（<640px）时左侧标题块堆到内容上方。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 目测** — 在 `.claude/launch.json` 的 `dev` 配置下启动，浏览器打开 `http://localhost:5173/`，执行 `localStorage.setItem('oa:view','"2d"')` 后刷新；在 375×812 和 1280×800 两种尺寸下检查：四个栏目都能切换、文字无溢出、和设计图下半部分风格一致、三种语言都正常。

- [ ] **Step 6: 提交** — `git commit -m "feat: 2d simple view"`

---

### Task 8: 3D 纯逻辑（胶片物理、推近、阅读状态机）

**Files:**
- Create: `src/scene/filmPhysics.js`, `src/scene/zoom.js`, `src/scene/readerMachine.js`, `tests/filmPhysics.test.js`, `tests/zoom.test.js`, `tests/readerMachine.test.js`
- Modify: `src/config.js`（加入下面列出的参数）

**Interfaces:**
- Produces:
  - `createFilm({ count: number, pitch: number }): Film`，`Film = { offset, vel, mode: 'drag'|'coast'|'spring', target, min: 0, max: (count-1)*pitch, pitch }`
  - `dragStart(f)`, `dragMove(f, worldDx: number, dt: number)`, `dragEnd(f)`, `wheel(f, delta: number)`, `nudge(f, dir: -1|1)`, `goTo(f, index: number)`, `stepFilm(f, dt: number)`, `filmIndex(f): number`（四舍五入并夹在范围内）, `isSettled(f): boolean`
  - `zoomDistance({ bezelW, bezelH, fovDeg, aspect, cover, maxHeightCover }): number`
  - `easeInOutCubic(t: number): number`
  - `loadTimeline(phase: number): { knob: number, zoom: number, done: boolean }`，`unloadTimeline(phase: number): { knob: number, zoom: number, done: boolean }`（knob/zoom 都是 0–1）
  - `READER = { IDLE: 'idle', LOADING: 'loading', ZOOMED: 'zoomed', UNLOADING: 'unloading' }`，`nextReader(state, event: 'LOAD'|'LOADED'|'BACK'|'UNLOADED'): string`，`canBrowse(state): boolean`

`config.js` 新增参数（值来自试验版）：`FILM: { PITCH: 1.2, COAST_DECAY: 2.6, COAST_TO_SPRING_V: 1.0, FLICK_V: 1.2, SPRING_K: 170, SPRING_ZETA: 0.72, RUBBER: 0.35, WHEEL_GAIN: 0.006, WHEEL_MAX_V: 14 }`，`TIMING: { KNOB: 0.35, ZOOM_START: 0.25, ZOOM_DUR: 1.15, LOAD_DONE: 1.45, UNZOOM_DUR: 1.0, KNOB_BACK_START: 0.65, UNLOAD_DONE: 1.05 }`。

- [ ] **Step 1: 写失败的测试**

```js
// filmPhysics
const run = (f, s = 3) => { for (let i = 0; i < s * 60; i++) stepFilm(f, 1 / 60); };
test('release after slow drag snaps to nearest frame', () => {
  const f = createFilm({ count: 4, pitch: 1.2 }); dragStart(f); dragMove(f, -0.8, 0.5); dragEnd(f); run(f);
  expect(filmIndex(f)).toBe(1); expect(Math.abs(f.offset - 1.2)).toBeLessThan(0.01); expect(isSettled(f)).toBe(true);
});
test('flick coasts further than a slow drag', () => {
  const f = createFilm({ count: 4, pitch: 1.2 }); dragStart(f); dragMove(f, -0.5, 0.05); dragEnd(f); run(f);
  expect(filmIndex(f)).toBeGreaterThanOrEqual(2);
});
test('settle bounce stays small', () => {
  const f = createFilm({ count: 4, pitch: 1.2 }); nudge(f, 1); let peak = 0;
  for (let i = 0; i < 180; i++) { stepFilm(f, 1 / 60); peak = Math.max(peak, f.offset); }
  expect(peak - 1.2).toBeGreaterThan(0); expect(peak - 1.2).toBeLessThan(0.12);
});
test('ends clamp and rubber-band back', () => {
  const f = createFilm({ count: 4, pitch: 1.2 }); dragStart(f); dragMove(f, 3, 0.5);
  expect(f.offset).toBeLessThan(0); expect(f.offset).toBeGreaterThan(-3 * 0.36); dragEnd(f); run(f);
  expect(filmIndex(f)).toBe(0); nudge(f, -1); run(f); expect(filmIndex(f)).toBe(0);
});
test('wheel scrolls and is bounded', () => {
  const f = createFilm({ count: 4, pitch: 1.2 }); for (let i = 0; i < 50; i++) wheel(f, 500); run(f, 5);
  expect(filmIndex(f)).toBe(3);
});
// zoom
test('zoomDistance gives 75% width on 16:9', () => {
  const d = zoomDistance({ bezelW: 2.62, bezelH: 1.82, fovDeg: 34, aspect: 16 / 9, cover: 0.75, maxHeightCover: 0.9 });
  const visW = 2 * d * Math.tan((34 / 2) * Math.PI / 180) * (16 / 9);
  expect(2.62 / visW).toBeCloseTo(0.75, 3);
});
test('zoomDistance caps height on narrow aspect', () => {
  const d = zoomDistance({ bezelW: 2.62, bezelH: 1.82, fovDeg: 34, aspect: 4 / 3, cover: 0.75, maxHeightCover: 0.9 });
  const visH = 2 * d * Math.tan((34 / 2) * Math.PI / 180);
  expect(1.82 / visH).toBeLessThanOrEqual(0.9 + 1e-9);
});
test('timelines start and end correctly', () => {
  expect(loadTimeline(0)).toEqual({ knob: 0, zoom: 0, done: false });
  expect(loadTimeline(1.5)).toMatchObject({ knob: 1, zoom: 1, done: true });
  expect(unloadTimeline(0)).toMatchObject({ knob: 1, zoom: 1, done: false });
  expect(unloadTimeline(1.1)).toMatchObject({ knob: 0, zoom: 0, done: true });
});
// reader machine
test('reader machine happy path', () => {
  let s = READER.IDLE;
  for (const [e, want] of [['LOAD', 'loading'], ['LOADED', 'zoomed'], ['BACK', 'unloading'], ['UNLOADED', 'idle']]) { s = nextReader(s, e); expect(s).toBe(want); }
});
test('reader machine ignores events outside their state', () => {
  expect(nextReader('loading', 'LOAD')).toBe('loading');
  expect(nextReader('loading', 'BACK')).toBe('loading');
  expect(nextReader('unloading', 'LOAD')).toBe('unloading');
  expect(nextReader('zoomed', 'LOAD')).toBe('zoomed');
  expect(nextReader('idle', 'BACK')).toBe('idle');
  expect(canBrowse('zoomed')).toBe(false); expect(canBrowse('idle')).toBe(true);
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**。物理规则照 `spike/main.js` 的 `frame()`/指针处理：拖动越界时 `offset = min - (min - raw) * RUBBER`；松手时 `|vel| > FLICK_V` 进入 coast，否则 spring 到最近帧；coast 时 `vel *= exp(-COAST_DECAY*dt)`，越界额外 `exp(-14*dt)`，`|vel| < COAST_TO_SPRING_V` 时转 spring；spring 用 `k=SPRING_K`、`c=2*sqrt(k)*SPRING_ZETA` 的半隐式欧拉；`wheel` 累加 `delta*WHEEL_GAIN` 到速度并夹在 ±WHEEL_MAX_V。`zoomDistance` 取宽度约束与高度约束中较大的距离。时间线照 `TIMING`，曲线用 `easeInOutCubic`。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: film physics, zoom math and reader state machine"`

---

### Task 9: 开场过场

**Files:**
- Create: `src/intro/intro.js`, `src/styles/intro.css`, `tests/intro.test.js`
- Modify: `src/main.js`（用真正的 `runIntro`）

**Interfaces:**
- Consumes: `t`, `readPref`/`writePref('introSeen')`
- Produces:
  - `introSchedule(seen: boolean): { lampOn: number, typeStart: number, typeEnd: number, answerAt: number, end: number }`（毫秒）
  - `runIntro(root: HTMLElement, { ready: Promise<void>, seen: boolean, lang: string, reducedMotion: boolean }): Promise<void>` — 跳过、或时间到且 `ready` 已完成时 resolve；结束后写 `introSeen = true`

- [ ] **Step 1: 写失败的测试**（`vi.useFakeTimers()`）

```js
test('first visit lasts 4–6 s, returning visit ≤ 1.8 s', () => {
  const a = introSchedule(false); expect(a.end).toBeGreaterThanOrEqual(4000); expect(a.end).toBeLessThanOrEqual(6000);
  expect(introSchedule(true).end).toBeLessThanOrEqual(1800);
});
test('skip resolves immediately', async () => {
  const root = document.createElement('div'); let done = false;
  runIntro(root, { ready: Promise.resolve(), seen: false, lang: 'en', reducedMotion: false }).then(() => done = true);
  root.querySelector('[data-skip]').click(); await vi.runAllTimersAsync(); expect(done).toBe(true);
});
test('holds on last frame until ready, showing loading hint', async () => {
  const root = document.createElement('div'); let release; const ready = new Promise(r => release = r); let done = false;
  runIntro(root, { ready, seen: false, lang: 'en', reducedMotion: false }).then(() => done = true);
  await vi.advanceTimersByTimeAsync(introSchedule(false).end + 500);
  expect(done).toBe(false); expect(root.querySelector('.intro-loading').hidden).toBe(false);
  release(); await vi.runAllTimersAsync(); expect(done).toBe(true);
});
test('question text follows language', () => {
  const root = document.createElement('div'); runIntro(root, { ready: Promise.resolve(), seen: false, lang: 'zh', reducedMotion: false });
  expect(root.querySelector('.intro-q').dataset.text).toBe(t('intro.question', 'zh'));
});
test('marks intro as seen', async () => {
  const root = document.createElement('div'); await Promise.all([runIntro(root, { ready: Promise.resolve(), seen: false, lang: 'en', reducedMotion: false }), vi.runAllTimersAsync()]);
  expect(readPref('introSeen', false)).toBe(true);
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**。首次时间表：灯亮 0–800ms，打字 900–3300ms，答案 3700ms 淡入，结束 5000ms；再次访问：问句直接显示，1500ms 结束。画面：黑底中心一团暖光渐亮（径向渐变 + 轻微闪烁）、全屏胶片颗粒（CSS 动画噪点）、问句打字机效果（等宽光标）、答案用斜体衬线小字。`reducedMotion` 为真时不做闪烁和打字动画，直接显示文字。结束时整个层 600ms 淡出。右下角 `SKIP` 按钮。2D 版用 `seen: true` 的时间表。

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: 提交** — `git commit -m "feat: opening sequence with skip and load hold"`

---

### Task 10: 模型预处理

**Files:**
- Create: `scripts/prepare-models.mjs`, `public/models/reel.glb`, `public/models/tv.glb`, `public/models/lamp.glb`, `public/models/LICENSE.md`
- Modify: `package.json`（开发依赖 `@gltf-transform/core`、`@gltf-transform/extensions`、`@gltf-transform/functions`、`meshoptimizer`、`sharp`）

**Interfaces:**
- Produces（供 Task 11 使用）：
  - `reel.glb`：只含两个节点 `spool`（来自 `filmstrip_projector_8mm_spool_feed`）和 `woundFilm`（来自 `filmstrip_projector_8mm_01_film_side`），都已移到原点、盘面法线沿本地 x 轴
  - `tv.glb`（来自 `television_02`）、`lamp.glb`（来自 `desk_lamp_arm_01`，灯泡材质名保留 `_light` 后缀）
  - 全部 meshopt 压缩、贴图转 webp（最长边 1024）

- [ ] **Step 1: 写脚本**：用 Poly Haven API（`https://api.polyhaven.com/files/<id>`，请求要带 `User-Agent` 头，否则 403）下载 1k glTF 到临时目录 → 用 gltf-transform 读入 → `reel` 删除其他节点并把两个节点的平移清零 → `prune()`、`dedup()`、`weld()`、`textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] })`、`meshopt({ encoder: MeshoptEncoder })` → 写出 glb。`LICENSE.md` 写明三个模型的 Poly Haven 页面链接与 CC0 声明。

- [ ] **Step 2: 运行并检查体积**

Run: `npm run models`
Expected: 打印三个文件大小，总和 < 6.5 MB（设计文档 §5 的目标：试验版 13 MB 的一半以下）。

- [ ] **Step 3: 提交** — `git add scripts public/models package.json package-lock.json && git commit -m "chore: compressed CC0 models for the reader bench"`

---

### Task 11: 3D 场景搭建（静态）

**Files:**
- Create: `src/scene/stage.js`, `src/scene/textures.js`, `src/scene/models.js`, `src/scene/machine.js`, `src/scene/film.js`
- Modify: `src/config.js`（场景布局参数）

**Interfaces:**
- Consumes: `CONFIG`、`SECTIONS`、`t`
- Produces:
  - `createStage(canvas: HTMLCanvasElement): Stage`，`Stage = { renderer, scene, camera, setFocus(rect: [x0,y0,x1,y1] /* 0–1 屏幕坐标 */, dim: number): void, resize(): void, render(time: number): void }`
  - `loadModels(base: string): Promise<{ spool: Object3D, woundFilm: Object3D, tv: Object3D, lamp: Object3D, lampHead: Vector3 }>`（GLTFLoader + `MeshoptDecoder`；统一调色照 `spike/models.js` 的 `retint`）
  - `buildMachine(stage: Stage, models): Machine`，`Machine = { rewinds: { left: Rewind, right: Rewind }, screen: { rig: Group, glass: Mesh, bezel: Mesh, restPos: Vector3, drawIdle(index: number, lang: string): void }, loadKnob: { group: Group, setTurn(t01: number): void }, langKnob: { group: Group, setLang(lang: string): void }, update(time: number): void }`；`Rewind = { setSpin(angle: number): void, setFill(f01: number): void }`（右侧带摇把）
  - `buildFilm(stage: Stage, lang: string): Film3D`，`Film3D = { meshes: Mesh[], update(offset: number): void, frameAt(mesh: Mesh): number | null, relabel(lang: string): void }`

`config.js` 场景参数（试验版最终值）：`CAMERA: { POS: [0, 2.55, 6.6], LOOK: [0, 1.45, 0], FOV: 34 }`，`FILM_CENTER: [0, 0.55, 0.95]`，`BEND: 0.045`，`TILT: -0.62`，`LEAD: 5`，`REEL: { X: 3.05, R: 0.85 }`，`SCREEN: { REST: [0.35, 2.12, -1.05], BEZEL: [2.62, 1.82], GLASS: [2.3, 1.5], SLIDE: 0.9 }`，`LOAD_KNOB: [2.05, 1.0, -0.05]`，`LANG_KNOB: [-2.05, 0.95, -0.05]`，`LAMP: [3.3, 0.36, -1.7]`。

- [ ] **Step 1: 实现 `stage.js`**：ACES 色调映射、曝光 1.05、PCF 软阴影、`RoomEnvironment` 环境光强度 0.32、`FogExp2(0x0a0705, 0.055)`；后期链 `RenderPass → UnrealBloomPass(0.45, 0.55, 0.92) → OutputPass → 胶片着色器`（颗粒 0.045、暗角、偏暖调色、轻微闪烁、按 `setFocus` 的矩形对屏外做 5×5 模糊和最多 55% 压暗）。像素比上限 2。

- [ ] **Step 2: 实现 `textures.js`、`models.js`**（照试验版：磨损粗糙度贴图、木纹、工业窗、四个栏目的棕褐色帧画、片头倒数帧、表盘贴图；帧画上的栏目名用 `t('section.<id>.title', lang)`）。

- [ ] **Step 3: 实现 `machine.js`**：木台面、背墙与窗、左前方三层胶片铁盒、左右卷片盘（铁支架 + `spool`/`woundFilm` 克隆，右侧摇把）、读片口（底座 + 黄铜框 + 发光内边）、屏幕组（`tv` 外壳 + 黄铜边框 + 玻璃，空闲画面用 canvas 贴图，文案 `ui.screen.load`）、载入旋钮（铸铁底座 + 立柱 + 铁壳 + 表盘刻 VIEW/LOAD + 滚花旋钮 + 指针）、语言旋钮（与载入旋钮同结构、半径约 0.6 倍，表盘刻 `EN · 中 · 日` 三档，`setLang` 把指针转到 −45°/0°/+45°）、台灯（`lamp` 模型 + 聚光灯照向读片口 + 灯光里的灰尘粒子）、半球光/轮廓光/补光。不得出现 Global Constraints 里列为"不要"的任何部件。

- [ ] **Step 4: 实现 `film.js`**：`LEAD` 帧片头 + 4 个栏目帧 + `LEAD` 帧片尾；姿态函数照试验版 `filmPose`（含两端立起）；`|s| ≥ REEL.X − 0.15` 的帧隐藏；当前帧发光、上浮 0.05。

- [ ] **Step 5: 临时挂载并目测** — 在 `main.js` 的 3D 分支里暂时只调用这些构建函数并 `render`，启动 `dev`，在 1440×810 下对照 `spike/`（`npx vite spike --port 5180` 或已有的 spike 预览）检查：是一台完整的机器、两个卷片盘与胶片连贯、没有任何被否决的部件、旋钮是独立立柱、模型颜色统一、浏览器控制台无报错。

- [ ] **Step 6: 跑全部测试** — `npm test` → PASS（场景代码不应破坏已有测试）

- [ ] **Step 7: 提交** — `git commit -m "feat: static 3d reader bench scene"`

---

### Task 12: 3D 交互总装

**Files:**
- Create: `src/scene/scene3d.js`, `src/styles/chrome.css`
- Modify: `src/main.js`, `index.html`（UI 外壳：品牌、计数、提示、右上角按钮、阅读层、BACK 按钮）

**Interfaces:**
- Consumes: Task 8 的全部纯函数，Task 11 的 `Stage`/`Machine`/`Film3D`，`renderSection`，`createSound`，i18n，`switchView`
- Produces: `mountScene(root: HTMLElement, opts: { sound: Sound, switchView: (v) => void }): Promise<{ destroy(): void }>` — 模型加载完、第一帧画出后 resolve（这个 Promise 就是开场的 `ready`）；WebGL 创建失败或模型加载失败时 reject（由 Task 6 的 `mountView` 退回 2D）

- [ ] **Step 1: 实现输入与循环**（设计文档 §4.4、§4.5）：
  - 只有 `canBrowse(state)` 时才响应拖动/滚轮/方向键；拖动的屏幕像素按"胶片深度处每像素对应的世界宽度"换算成 `worldDx`。
  - 每帧：`stepFilm` → `film.update(offset)` → 卷片盘 `setSpin(-offset / REEL.R)`、`setFill`（左 `1−progress`、右 `progress`）→ 当前帧变化时 `sound.tick()`、`screen.drawIdle`、更新顶部计数 `02 / 04 · PROJECTS`。
  - 点击：命中载入旋钮或屏幕 → 载入；命中中间帧 → 载入；命中其他内容帧 → `goTo` 该帧；点击语言旋钮 → 循环切换语言。
  - 键盘：Enter 载入；Esc/Backspace 返回。
- [ ] **Step 2: 实现载入/返回**：状态转换全部经过 `nextReader`；`loadTimeline`/`unloadTimeline` 驱动旋钮 `setTurn`、屏幕滑出（`SLIDE`）、镜头插值到 `zoomDistance` 算出的位置、`stage.setFocus(屏幕边框投影矩形, zoom)`；载入时 `sound.clunk()`，250ms 后 `whirr()`，屏幕亮起时 `powerOn()`；完成后显示阅读层并 `renderSection` 当前栏目。
- [ ] **Step 3: 阅读层与返回控件**：每帧把玻璃四角投影成屏幕矩形，设置阅读层的 left/top/width/height；阅读层内可滚动、扫描线、开机闪烁动画（参考 `spike/style.css` 的 `.reader`、`@keyframes poweron`）。屏幕下方居中的 `◀ BACK` + `ESC` 键帽按钮样式照 `spike/style.css` 最终的 `.exit`（12px 等宽、深色底、`#d9822f` 描边发光、9px 圆角、浅色键帽、淡入后脉动两次）。点击画布任意处（阅读层以外）在 `zoomed` 时触发返回。窗口尺寸变化时重算推近位置和阅读层。
- [ ] **Step 4: 外壳 UI**（`chrome.css`）：左上品牌（`— PERSONAL PORTFOLIO —`、`Optical Archive`、名字、职位），顶部中间计数，底部提示（`ui.hint.browse` · `ui.hint.load`），右上角声音开关与 `Simple View` 按钮（调用 `switchView('2d')`）；阅读时品牌、计数、提示淡出。切换语言时：帧画 `relabel`、屏幕空闲画面重画、外壳文字更新、阅读层重渲染，屏幕闪一下。
- [ ] **Step 5: 目测验证**（启动 `dev`，1440×810）：
  - 拖动、甩动、滚轮、方向键都能卷，停下有轻微回弹，卷片盘/摇把/胶片厚度联动。
  - Enter、点中间帧、点旋钮、点屏幕都能载入；旋钮转到 LOAD；屏幕宽度约占 75%；屏外压暗虚化。
  - 三种返回方式都有效；载入动画中连按 Enter/Esc 不会卡住。
  - 阅读时把窗口拖成接近 4:3 和 21:9，屏幕完整可见、阅读层对齐。
  - 语言旋钮三档切换后，所有文字（帧、屏幕、外壳、阅读层）都换语言。
  - 控制台无报错；把 `public/models/tv.glb` 临时改名后刷新，确认自动进入 2D 版，再改回来。
- [ ] **Step 6: 跑全部测试** — `npm test` → PASS
- [ ] **Step 7: 提交** — `git commit -m "feat: interactive 3d reader with load, read and return"`

---

### Task 13: 收尾与发布

**Files:**
- Create: `README.md`, `public/og.png`（1200×630，开场画面或场景截图）
- Modify: `index.html`（meta description、Open Graph、favicon）、`src/main.js` / `src/scene/stage.js`（降级与减少动态效果）

- [ ] **Step 1: 降级与减少动态效果**：`devicePixelRatio > 1.5` 且硬件线程数 ≤4 时像素比降到 1.5 并关闭阴影；`prefers-reduced-motion` 时开场走 `reducedMotion`、关闭屏幕闪烁与环境光闪烁、镜头推近时长减半。
- [ ] **Step 2: README**：中文写明如何本地运行（`npm install`、`npm run dev`）、如何改内容（`src/content/content.json` 字段说明，图片放 `public/images/`）、如何改界面文字（`strings.json`）、如何调推近比例（`src/config.js` 的 `SCREEN_COVER`）、模型授权说明。
- [ ] **Step 3: 全量检查** — `npm test && npm run build` → 全部 PASS，`dist/` 生成；`npx vite preview` 打开构建产物，3D 与 2D 各走一遍。
- [ ] **Step 4: 提交** — `git commit -m "docs: README; perf fallbacks and reduced motion"`
- [ ] **Step 5: 发布（需网站主人操作/确认）**：请网站主人提供 GitHub 用户名并创建仓库（主站形式为 `<用户名>.github.io`），在仓库 Settings → Pages 里把 Source 设为 GitHub Actions。经网站主人确认后再 `git remote add origin ...` 并 `git push -u origin main`；推送后检查 Actions 运行成功、线上地址能打开 3D 与 2D 两个版本。
