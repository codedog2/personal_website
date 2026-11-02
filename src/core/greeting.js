// The greeting shown on the reading screen after the intro: time-of-day hello, the visitor's ISP and city
// (third-party IP lookup, ipapi.co — nothing is stored), estimated speed, the CDN edge that served the
// page (read from GitHub Pages / Fastly's x-served-by header), and a verdict with a face.
import { t } from './i18n.js';

const IP_LOOKUP = 'https://ipapi.co/json/';
const TIMEOUT_MS = 3500;

const POPS = {
  TYO: 'Tokyo', NRT: 'Tokyo', HND: 'Tokyo', ITM: 'Osaka', KIX: 'Osaka', HKG: 'Hong Kong', SIN: 'Singapore', QPG: 'Singapore',
  ICN: 'Seoul', SEL: 'Seoul', TPE: 'Taipei', SYD: 'Sydney', MEL: 'Melbourne', AKL: 'Auckland', BKK: 'Bangkok', KUL: 'Kuala Lumpur',
  MNL: 'Manila', CGK: 'Jakarta', BOM: 'Mumbai', DEL: 'Delhi', MAA: 'Chennai', LAX: 'Los Angeles', SJC: 'San Jose',
  SFO: 'San Francisco', PAO: 'Palo Alto', SEA: 'Seattle', IAD: 'Washington DC', BWI: 'Baltimore', EWR: 'Newark', LGA: 'New York',
  JFK: 'New York', BOS: 'Boston', ORD: 'Chicago', CHI: 'Chicago', DFW: 'Dallas', DAL: 'Dallas', ATL: 'Atlanta', MIA: 'Miami',
  DEN: 'Denver', PHX: 'Phoenix', YYZ: 'Toronto', YVR: 'Vancouver', YUL: 'Montreal', LHR: 'London', LCY: 'London', LON: 'London',
  MAN: 'Manchester', DUB: 'Dublin', FRA: 'Frankfurt', AMS: 'Amsterdam', CDG: 'Paris', MAD: 'Madrid', MXP: 'Milan', ARN: 'Stockholm',
  CPH: 'Copenhagen', OSL: 'Oslo', HEL: 'Helsinki', VIE: 'Vienna', WAW: 'Warsaw', GRU: 'São Paulo', GIG: 'Rio de Janeiro',
  SCL: 'Santiago', BOG: 'Bogotá', EZE: 'Buenos Aires', JNB: 'Johannesburg', CPT: 'Cape Town', DXB: 'Dubai', FJR: 'Fujairah',
};

/** "cache-sjc10045-SJC, cache-nrt-...-NRT" → "NRT" (the edge nearest the visitor is listed last). */
export function parsePop(header) {
  if (!header) return null;
  const last = String(header).split(',').pop().trim();
  const m = /-([A-Z]{3})$/.exec(last);
  return m ? m[1] : null;
}

export function popCity(code) {
  return POPS[code] || code;
}

/** Mbps from a resource timing entry; null when the transfer is too small (or cached) to say anything. */
export function estimateMbps({ transferSize, duration }) {
  if (!(transferSize > 10_000) || !(duration > 0)) return null;
  return (transferSize * 8) / (duration / 1000) / 1e6;
}

export function connectionQuality({ mbps, rttMs }) {
  if (mbps == null && rttMs == null) return 'unknown';
  const fastEnough = mbps == null || mbps >= 8, quickEnough = rttMs == null || rttMs < 180;
  return fastEnough && quickEnough ? 'nice' : 'poor';
}

const timeOfDay = hour => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening');
const FACE = { nice: ':)', poor: ':(', unknown: ':|' };

export function greetingLines({ hour, city, isp, mbps, pop, quality }, lang) {
  const unknown = t('greet.unknown', lang);
  const who = city ? t('greet.visitorFrom', lang).replace('{city}', city) : t('greet.visitor', lang);
  return [
    `${t(`greet.${timeOfDay(hour)}`, lang)}, ${who}`,
    `${t('greet.isp', lang)} : ${isp || unknown}`,
    `${t('greet.speed', lang)} : ${mbps != null ? `${mbps.toFixed(1)} Mbps` : unknown}`,
    `${t('greet.node', lang)} : ${pop ? `${popCity(pop)} (${pop})` : unknown}`,
    `${t(`greet.quality.${quality}`, lang)} ${FACE[quality]}`,
  ];
}

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** Collects everything greetingLines needs. Every lookup is optional; failures become nulls. */
export async function gatherGreetingData({
  fetchImpl = globalThis.fetch, perf = globalThis.performance, nav = globalThis.navigator ?? {},
  href = globalThis.location?.href ?? '', now = new Date(),
} = {}) {
  const ip = withTimeout(fetchImpl(IP_LOOKUP).then(r => (r.ok ? r.json() : null))).catch(() => null);
  const t0 = perf.now();
  const edge = withTimeout(fetchImpl(href, { method: 'HEAD', cache: 'no-store' }))
    .then(r => ({ pop: parsePop(r.headers?.get?.('x-served-by')), rttMs: perf.now() - t0 }))
    .catch(() => ({ pop: null, rttMs: null }));

  const timed = (perf.getEntriesByType?.('resource') ?? [])
    .filter(e => /\.(glb|woff2?|js)(\?|$)/.test(e.name))
    .map(estimateMbps).filter(v => v != null);
  const mbps = timed.length ? Math.max(...timed) : (typeof nav.connection?.downlink === 'number' ? nav.connection.downlink : null);

  const [info, { pop, rttMs }] = await Promise.all([ip, edge]);
  return {
    hour: now.getHours(),
    city: info?.city || null,
    isp: info?.org || null,
    mbps, pop, rttMs,
    quality: connectionQuality({ mbps, rttMs }),
  };
}
