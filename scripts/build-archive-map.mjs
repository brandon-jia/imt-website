// Source: world-atlas 2.0.2 countries-110m.json, derived from public-domain
// Natural Earth data. See docs/website-review.md for attribution and scope.
import { readFile, writeFile } from 'node:fs/promises';
const world = JSON.parse(await readFile('scripts/world-atlas.json', 'utf8'));
const active = ['United States of America','United Kingdom','Italy','France','Russia','Algeria','Burkina Faso','Egypt','Ethiopia','Ghana','Kenya','Malawi','Morocco','Nigeria','Rwanda','Bangladesh','India','Iran','Kyrgyzstan','Malaysia','Pakistan','Philippines','United Arab Emirates','Vietnam','Brazil','Peru','New Zealand','Timor-Leste'];
const arcs = world.arcs.map(arc => {
  let x = 0, y = 0;
  return arc.map(point => { x += point[0]; y += point[1]; return [x * world.transform.scale[0] + world.transform.translate[0], y * world.transform.scale[1] + world.transform.translate[1]]; });
});
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function ringPath(ring) {
  const points = ring.flatMap((id, index) => {
    const coordinates = id < 0 ? arcs[~id].toReversed() : arcs[id];
    return index ? coordinates.slice(1) : coordinates;
  });
  return points.map((p, i) => `${i === 0 || Math.abs(p[0] - points[i - 1][0]) > 180 ? 'M' : 'L'}${((p[0] + 180) * 2.5).toFixed(1)},${((85 - p[1]) * 2.5).toFixed(1)}`).join('') + 'Z';
}
const paths = world.objects.countries.geometries.filter(country => country.properties.name !== 'Antarctica').map(country => {
  const rings = country.type === 'Polygon' ? country.arcs : country.arcs.flat();
  return `<path d="${rings.map(ringPath).join('')}" fill="${active.includes(country.properties.name) ? '#376347' : '#d8ded3'}"><title>${escape(country.properties.name)}</title></path>`;
}).join('');
await writeFile('public/archive-world-map.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 375" role="img" aria-labelledby="title desc"><title id="title">Spring 2026 participating regions</title><desc id="desc">Countries highlighted using the existing archive data: ${escape(active.join(', '))}. The highlighted subset is not an exhaustive list of all represented countries.</desc><rect width="900" height="375" fill="#f7f4ec"/><g stroke="#f7f4ec" stroke-width="0.6" stroke-linejoin="round">${paths}</g></svg>`);
console.log('Archive map is a local SVG; no JavaScript or third-party requests.');
