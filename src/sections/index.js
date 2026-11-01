import { renderAbout } from './about.js';
import { renderProjects } from './projects.js';
import { renderSkills } from './skills.js';
import { renderCertificates } from './certificates.js';

const RENDERERS = { about: renderAbout, projects: renderProjects, skills: renderSkills, certificates: renderCertificates };

export function renderSection(host, id, ctx) {
  host.lang = ctx.lang;
  RENDERERS[id](host, ctx);
}
