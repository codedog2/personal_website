// Placeholder content for the spike. All text here is fake.
export const SECTIONS = [
  { id: 'about', kind: 'about', title: 'About', tagline: 'Who is behind the archive' },
  { id: 'projects', kind: 'projects', title: 'Projects', tagline: 'Selected works, reel by reel' },
  { id: 'skills', kind: 'skills', title: 'Skills', tagline: 'Tools on the workbench' },
  { id: 'certificates', kind: 'certificates', title: 'Certificates', tagline: 'Badges earned & in progress' },
];

const PROJECTS = [
  { code: 'P-01', name: 'Localization Tool', img: 'linear-gradient(160deg,#cdb48a,#7d6440)', stack: ['Python', 'JSON'],
    text: 'A placeholder description of a localization helper that syncs string tables across languages.' },
  { code: 'P-02', name: 'AWS Learning', img: 'radial-gradient(circle at 60% 40%,#d8c6a0 0 20%,#8a7350 21% 60%,#5a4428)', stack: ['AWS', 'Docker'],
    text: 'A placeholder description of cloud experiments: deployment pipelines, storage, serverless functions.' },
  { code: 'P-03', name: 'Poké-like RPG', img: 'linear-gradient(#d9c7a0 0 45%,#8f7a55 46% 70%,#6d5838 71%)', stack: ['Godot 4', 'GDScript', 'JSON'],
    text: 'A turn-based monster RPG built with Godot 4: dice battles, data-driven monsters and moves, branching NPC dialogue.' },
];

const SKILLS = {
  LANGUAGES: [['Python', '■■■■□', '3 yrs · scripts, data tools, P-01'], ['GDScript', '■■■■□', '2 yrs · typed, signal-driven architecture'],
    ['C#', '■■■□□', '1 yr · Godot C# side'], ['JavaScript', '■■■□□', 'this very website']],
  ENGINES: [['Godot 4', '■■■■□', '2 yrs · battle, dialogue & save systems in P-03'], ['three.js', '■■□□□', 'the 3D archive machine you are looking at']],
  CLOUD: [['AWS', '■■■□□', '1 yr · EC2, S3, Lambda in P-02'], ['Docker', '■■□□□', 'containerised deployments']],
  TOOLS: [['Git', '■■■■□', 'daily version control'], ['JSON', '■■■■■', 'data-driven design everywhere'], ['Blender', '■■□□□', 'simple modelling']],
};

const CERTS = [
  { name: 'AWS Cloud Practitioner', icon: '☁', done: true, org: 'Amazon Web Services', date: '2025-06' },
  { name: 'JLPT N1', icon: '日', done: true, org: 'Japan Foundation', date: '2023-12' },
  { name: 'Placeholder Cert', icon: '⌘', done: true, org: 'Some Institute', date: '2024-03' },
  { name: 'AWS Solutions Architect', icon: '◈', done: false, org: 'Amazon Web Services', date: 'planned 2027' },
  { name: 'Placeholder Cert', icon: '✦', done: false, org: 'Some Institute', date: 'planned' },
];

function note(host, anchor, head, lvl, text) {
  host.querySelectorAll('.note').forEach(n => n.remove());
  const n = document.createElement('div'); n.className = 'note';
  n.innerHTML = `<div class="nh"><span>${head}</span><span>${lvl}</span></div>${text}`;
  const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
  n.style.left = Math.min(ar.left - hr.left + host.scrollLeft, hr.width * 0.7) + 'px';
  n.style.top = (ar.bottom - hr.top + host.scrollTop + 6) + 'px';
  host.appendChild(n);
}

export function renderSection(host, s) {
  const head = (k) => `<div class="kick">${k}</div><h2>${s.title}</h2><div class="sub">${s.tagline}</div>`;
  if (s.id === 'about') {
    host.innerHTML = `<div class="cols"><div class="main">${head('01 / 04 · ABOUT')}
      <p>A software engineer with an interdisciplinary background, interested in game development, cloud and interactive systems. This paragraph is placeholder text.</p>
      <p>From social design to software engineering — building systems that are reliable and a little bit delightful.</p>
      <div class="contact"><span class="k">EMAIL</span><a href="#">name@example.com</a><span class="k">GITHUB</span><a href="#">github.com/username</a><span class="k">LINKEDIN</span><a href="#">linkedin.com/in/username</a></div>
      </div><div class="card"><span class="clip"></span><div class="ph"></div>
      <div class="k">EDUCATION</div><div class="v">Rikkyo University · M.A. Social Design<br>ECUST · B.A. Japanese Studies</div>
      <div class="k">INTERESTS</div><div class="v">Game Dev · Cloud · Interactive Systems</div></div></div>`;
  } else if (s.id === 'projects') {
    const list = () => {
      host.innerHTML = `${head('02 / 04 · PROJECTS')}<div class="strip">${PROJECTS.map((p, i) =>
        `<div class="pf" data-i="${i}"><div class="img" style="background:${p.img}"></div><div class="lbl">${p.code}</div><div class="nm">${p.name}</div></div>`).join('')}</div>`;
      host.querySelectorAll('.pf').forEach(el => el.onclick = () => detail(PROJECTS[+el.dataset.i]));
    };
    const detail = (p) => {
      host.innerHTML = `<div class="kick">02 / 04 · PROJECTS</div><h2>${p.code} / ${p.name}</h2><div class="sub">Placeholder project</div>
        <div class="cols detail"><div class="main"><div class="hero" style="background:${p.img}"></div></div>
        <div style="flex:1"><div class="grp-name">OVERVIEW</div><p>${p.text}</p><div class="grp-name">TECH STACK</div>
        ${p.stack.map(k => `<span class="tk">${k}</span>`).join('')}</div></div><span class="linkback">← ALL PROJECTS</span>`;
      host.querySelector('.linkback').onclick = list;
      host.scrollTop = 0;
    };
    list();
  } else if (s.id === 'skills') {
    host.innerHTML = head('03 / 04 · SKILLS') + Object.entries(SKILLS).map(([g, items]) =>
      `<div class="grp"><div class="grp-name">${g}</div>${items.map(([n], i) => `<span class="tk" data-g="${g}" data-i="${i}">${n}</span>`).join('')}</div>`).join('');
    host.querySelectorAll('.tk').forEach(tk => tk.onclick = (e) => {
      e.stopPropagation();
      host.querySelectorAll('.tk').forEach(t => t.classList.remove('on')); tk.classList.add('on');
      const [n, lvl, text] = SKILLS[tk.dataset.g][+tk.dataset.i];
      note(host, tk, n.toUpperCase(), lvl, text);
    });
    host.onclick = () => { host.querySelectorAll('.note').forEach(n => n.remove()); host.querySelectorAll('.tk').forEach(t => t.classList.remove('on')); };
  } else if (s.id === 'certificates') {
    const got = CERTS.filter(c => c.done).length;
    host.innerHTML = head('04 / 04 · CERTIFICATES') +
      `<div class="tally"><b>${got}</b>EARNED <b>${CERTS.length - got}</b>IN PROGRESS</div>
       <div class="badges">${CERTS.map((c, i) => `<div class="badge ${c.done ? '' : 'locked'}" data-i="${i}"><div class="medal">${c.icon}</div><div class="bn">${c.name}</div></div>`).join('')}</div>`;
    host.querySelectorAll('.badge').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const c = CERTS[+b.dataset.i];
      note(host, b, c.done ? 'EARNED' : 'IN PROGRESS', c.date, `<b>${c.name}</b><br>${c.org}${c.done ? '<br><a href="#">View credential →</a>' : '<br>Currently preparing.'}`);
    });
    host.onclick = () => host.querySelectorAll('.note').forEach(n => n.remove());
  }
}
