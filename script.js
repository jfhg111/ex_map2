const map = L.map('map', { zoomControl: false }).setView([37.196554, 126.911871], 10);
const bounds = L.latLngBounds( //지도 보이는 범위 설정
  [36.886521, 126.557641], // 남서쪽 한계
  [37.403725, 127.272064]  // 북동쪽 한계
);
map.setMaxBounds(bounds);
map.setMinZoom(10); //최소최대 줌 설정
map.setMaxZoom(17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// 화면 높이 설정
function setContainerHeight() {
  const container = document.querySelector('.container');
  if (container) {
    container.style.height = `${window.innerHeight}px`;
  }
}
window.addEventListener('resize', setContainerHeight);
window.addEventListener('orientationchange', setContainerHeight);
setContainerHeight();

// 범례 맵 객체 선언
const legendMap = {};

// 범례 시트 불러오기
const legendSheetId = '1ZTUWQ7A1WOKYwz4jz5Q09JaxKwdP-cZ_tK8EnupkMMI';
const legendGid = '1998815174';
const legendUrl = `https://docs.google.com/spreadsheets/d/${legendSheetId}/gviz/tq?tqx=out:json&gid=${legendGid}`;

fetch(legendUrl)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    const legendContainer = document.getElementById('legend');
    rows.forEach(row => {
      const type = row.c[1]?.v;
      const shape = row.c[2]?.v;
      const color = row.c[3]?.v;

      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.marginBottom = '6px';

      const icon = document.createElement('span');
      icon.textContent = shape;
      icon.style.color = color;
      icon.style.marginRight = '8px';

      const label = document.createElement('span');
      label.textContent = type;
      const trgt = row.c[4]?.v;
      const desc = row.c[5]?.v;
      const serv = row.c[6]?.v;
      const fee = row.c[7]?.v;

      item.dataset.type = type;
      item.dataset.trgt = trgt;
      item.dataset.desc = desc;
      item.dataset.serv = serv;
      item.dataset.fee = fee;

      legendMap[type] = { trgt, desc, serv, fee };

      label.style.cursor = 'pointer';
      label.addEventListener('click', () => {
        showLegendInfo(type, trgt, desc, serv, fee);
      });

      item.appendChild(icon);
      item.appendChild(label);
      legendContainer.appendChild(item);
    });

    document.querySelector('.legend-info-close').addEventListener('click', () => {
      document.getElementById('legend-info').classList.add('hidden');
    });

    // 팝업 외부 클릭 시 창 닫기
    document.getElementById('legend-info').addEventListener('click', (e) => {
      const content = document.querySelector('.legend-info-content');
      if (!content.contains(e.target)) {
        document.getElementById('legend-info').classList.add('hidden');
      }
    });
  })
  .catch(err => console.error('Google Sheet fetch error:', err));

// showLegendInfo 함수 추가
function showLegendInfo(type, trgt, desc, serv, fee) {
  const infoBox = document.getElementById('legend-info');
  const content = infoBox.querySelector('.legend-info-text');
  let html = '';
  if (type) html += `<h1>${type}</h1>`;
  if (trgt) html += `<p><strong>이용 대상:</strong> ${trgt}</p>`;
  if (desc) html += `<p><strong>장소 설명:</strong> ${desc}</p>`;
  if (serv) html += `<p><strong>지원 내용:</strong> ${serv}</p>`;
  if (fee) html += `<p><strong>이용료:</strong> ${fee}</p>`;
  content.innerHTML = html;
  infoBox.classList.remove('hidden');
}

// 포인트 시트 불러오기 및 마커 표시
const pointsSheetId = '1ZTUWQ7A1WOKYwz4jz5Q09JaxKwdP-cZ_tK8EnupkMMI';
const pointsGid = '0';
const pointsUrl = `https://docs.google.com/spreadsheets/d/${pointsSheetId}/gviz/tq?tqx=out:json&gid=${pointsGid}`;

fetch(pointsUrl)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    const geojson = {
      type: "FeatureCollection",
      features: rows.map(row => {
        const c = row.c;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              parseFloat(c[2]?.v),
              parseFloat(c[1]?.v)
            ]
          },
          properties: {
            type: c[3]?.v,
            name: c[4]?.v,
            adrs: c[5]?.v,
            capa: c[6]?.v,
            sem_t: c[7]?.v,
            vac_t: c[8]?.v,
            time: c[9]?.v,
            phone: c[10]?.v,
            shape: c[11]?.v,
            color: c[12]?.v
          }
        };
      })
    };

    L.geoJSON(geojson, {
      pointToLayer: function (feature, latlng) {
        const shape = feature.properties.shape || '⬤';
        const color = feature.properties.color || '#333';
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-shape" style="color:${color}">${shape}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        return L.marker(latlng, { icon: icon });
      },
      onEachFeature: function (feature, layer) {
        const p = feature.properties;
        let popup = `<div class="custom-popup">`;
        if (p.type) popup += `<span class="popup-type"style="color:${p.color}">${p.type}</span>`;
        if (p.name) popup += `<span class="popup-name">${p.name}</span><br>`;
        if (p.adrs) popup += `<span class="popup-adrs">${p.adrs}</span>`;
        if (p.phone) popup += `<span class="popup-phone">📞 ${p.phone}</span>`;
        if (p.sem_t) popup += `<span class="popup-time">학기중 ${p.sem_t}</span>`;
        if (p.vac_t) popup += `<span class="popup-time">방학중 ${p.vac_t}</span>`;
        if (p.time) popup += `<span class="popup-time">운영 시간 ${p.time}</span>`;
        popup += `<button class="popup-more" data-type="${p.type}">더보기</button><br>`;
        popup += `</div>`;
        layer.bindPopup(popup);

        layer.on('popupopen', () => {
          const btn = document.querySelector('.popup-more');
          if (btn) {
            btn.addEventListener('click', () => {
              const type = btn.dataset.type;
              const { trgt, desc, serv, fee } = legendMap[type] || {};
              showLegendInfo(type, trgt, desc, serv, fee);
            });
          }
        });
      }
    }).addTo(map);
  })
  .catch(err => console.error('포인트 데이터 불러오기 실패:', err));

// 지도 상에서 이동/줌 시 범례 숨김 처리
let hideTimer;
map.on('movestart zoomstart dragstart', () => {
  document.querySelector('.legend-bar')?.classList.add('hidden');
  clearTimeout(hideTimer);
});
map.on('moveend zoomend dragend', () => {
  hideTimer = setTimeout(() => {
    document.querySelector('.legend-bar')?.classList.remove('hidden');
  }, 1500);
});

// 도움말 모달 열고 닫기
const helpBtn = document.querySelector('.help-button');
const modal = document.getElementById('help-modal');
const closeBtn = document.getElementById('help-modal-close');

if (helpBtn && modal && closeBtn) {
  helpBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent && !modalContent.contains(e.target)) {
      modal.classList.add('hidden');
    }
  });
}