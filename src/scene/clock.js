// Visitor's local time for the reading screen's header.
const pad = n => String(n).padStart(2, '0');

export function clockText(d = new Date()) {
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    date: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`,
  };
}
