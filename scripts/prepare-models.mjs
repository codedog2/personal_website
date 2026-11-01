// Downloads the CC0 Poly Haven models used by the reader bench and writes compressed .glb files
// to public/models. Run with `npm run models`; the outputs are committed, so CI never downloads.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const OUT = path.resolve('public/models');
const CACHE = path.join(tmpdir(), 'optical-archive-models');
const HEADERS = { 'User-Agent': 'optical-archive-build/1.0 (personal portfolio)' };   // Poly Haven returns 403 without one

const MODELS = [
  { id: 'filmstrip_projector_8mm', out: 'reel.glb',
    keep: { filmstrip_projector_8mm_spool_feed: 'spool', filmstrip_projector_8mm_01_film_side: 'woundFilm' } },
  { id: 'television_02', out: 'tv.glb' },
  { id: 'desk_lamp_arm_01', out: 'lamp.glb' },
];

async function download(id) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: HEADERS })).json();
  const g = files.gltf['1k'].gltf;
  const dir = path.join(CACHE, id);
  const jobs = [[g.url, path.basename(new URL(g.url).pathname)], ...Object.entries(g.include ?? {}).map(([rel, v]) => [v.url, rel])];
  for (const [url, rel] of jobs) {
    const dest = path.resolve(dir, rel);
    if (!dest.startsWith(path.resolve(dir))) throw new Error(`refusing path outside cache: ${rel}`);
    await mkdir(path.dirname(dest), { recursive: true });
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  return path.join(dir, jobs[0][1]);
}

/** Keep only the named root nodes, rename them, and move them to the origin so they spin in place. */
function isolate(doc, keep) {
  for (const node of doc.getRoot().listNodes()) {
    const name = node.getName();
    if (keep[name]) { node.setName(keep[name]).setTranslation([0, 0, 0]); continue; }
    if (!node.getParentNode()) node.dispose();
  }
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await mkdir(OUT, { recursive: true });

let total = 0;
for (const m of MODELS) {
  const doc = await io.read(await download(m.id));
  if (m.keep) isolate(doc, m.keep);
  // sharp must be the same version ndarray-pixels uses (two libvips builds in one process break colourspace)
  await doc.transform(
    prune(), dedup(), weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const file = path.join(OUT, m.out);
  await io.write(file, doc);
  const { size } = await stat(file);
  total += size;
  console.log(`${m.out.padEnd(10)} ${(size / 1e6).toFixed(2)} MB  (from ${m.id})`);
}
console.log(`total      ${(total / 1e6).toFixed(2)} MB`);
