const sheetId = '1ZTUWQ7A1WOKYwz4jz5Q09JaxKwdP-cZ_tK8EnupkMMI';
const gid = '1998815174';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

fetch(url)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    const legendContainer = document.getElementById('legend');
    if (!legendContainer) {
      console.warn('Legend container not found.');
      return;
    }

    rows.forEach(row => {
      const type = row.c[1]?.v;
      const shape = row.c[2]?.v;
      const color = row.c[3]?.v;

      const item = document.createElement('div');
      item.classList.add('legend-item');

      const icon = document.createElement('span');
      icon.classList.add('legend-icon');
      icon.textContent = shape;
      icon.style.color = color;

      const label = document.createElement('span');
      label.textContent = type;

      item.appendChild(icon);
      item.appendChild(label);
      legendContainer.appendChild(item);
    });
  })
  .catch(err => console.error('Error fetching legend data:', err));

let hideTimer;

map.on('movestart zoomstart', () => {
document.querySelector('.legend-bar')?.classList.add('hidden');
clearTimeout(hideTimer); // 이전 타이머 제거
});

map.on('moveend zoomend', () => {
hideTimer = setTimeout(() => {
    document.querySelector('.legend-bar')?.classList.remove('hidden');
}, 1500); // 1.5초 후 다시 나타남
});

function setContainerHeight() {
  const container = document.querySelector('.container');
  if (container) {
    container.style.height = `${window.innerHeight}px`;
  }
}

window.addEventListener('resize', setContainerHeight);
window.addEventListener('orientationchange', setContainerHeight);
setContainerHeight();