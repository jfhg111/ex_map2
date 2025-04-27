let currentFilterType = null; // 현재 선택된 필터의 상태를 저장하는 변수
const markers = []; // 지도에 표시된 마커를 저장할 배열

const map = L.map('map', { zoomControl: false }).setView([37.196554, 126.911871], 10);
const bounds = L.latLngBounds( //지도 가시범위 설정
  [36.886521, 126.557641], // 남서 한계
  [37.403725, 127.272064]  // 북동 한계
);
map.setMaxBounds(bounds);  //최소최대 줌 설정
  map.setMinZoom(10);
  map.setMaxZoom(17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { //오픈스트리트맵 불러오기
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

function setContainerHeight() { // 화면높이 컨테이너에 맞춰 설정
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
    rows.forEach(row => { //각 범례항목 줄 추가
      const type = row.c[1]?.v;
      const shape = row.c[2]?.v;
      const color = row.c[3]?.v;

      const item = document.createElement('div');
      item.classList.add('legend-item');

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
      label.addEventListener('click', () => { // 범례 이름 클릭 시 필터 적용
        if (currentFilterType === type) { // 이미 클릭된 항목이면 필터 해제 (전체 보기)

          currentFilterType = null;
          filterMarkersByType(null); // 전체 보이기
        } else {
          currentFilterType = type;
          filterMarkersByType(type); // 해당 type만 보이기
        }
      });      

      item.classList.add('legend-item');    // 범례 항목에 공통 클래스

      item.appendChild(icon);
      item.appendChild(label);
      legendContainer.appendChild(item);

    });

    // 마지막에 "전체보기" 버튼 추가
    const allItem = document.createElement('div');
    allItem.classList.add('legend-item');

    const allIcon = document.createElement('span');
    allIcon.textContent = '🔄';
    allIcon.style.marginRight = '8px';

    const allLabel = document.createElement('span');
    allLabel.textContent = '전체 표시';

    allItem.classList.add('legend-item'); // 전체보기 버튼도 동일 적용

    allItem.appendChild(allIcon);
    allItem.appendChild(allLabel);
    legendContainer.appendChild(allItem);

    allLabel.addEventListener('click', () => {
      currentFilterType = null;
      filterMarkersByType(null);  // 전체 마커 보이기
    });

    // 팝업 닫기 버튼
    document.querySelector('.type-info-close').addEventListener('click', () => {
      document.getElementById('type-info').classList.add('hidden');
    });

    // 팝업 외부 클릭 시 창 닫기
    document.getElementById('type-info').addEventListener('click', (e) => {
      const content = document.querySelector('.type-info-content');
      if (!content.contains(e.target)) {
        document.getElementById('type-info').classList.add('hidden');
      }
    });
  })
  .catch(err => console.error('Google Sheet fetch error:', err));

  // showTypeInfo 함수 추가
  function showTypeInfo(type, trgt, desc, serv, fee) {
    const infoBox = document.getElementById('type-info');
    const content = infoBox.querySelector('.type-info-text');
    
    // type-title을 테이블 밖으로 이동
    let html = '';
    if (type) html += `<div class="type-title">${type}</div>`;
  
    // 테이블 생성
    html += `<table class="type-info-table">`;
      if (trgt) html += `
        <tr>
          <td class="first-col">이용 대상</td>
          <td>${trgt}</td>
        </tr>`;
      if (desc) html += `
        <tr>
          <td class="first-col">장소 설명</td>
          <td>${desc}</td>
        </tr>`;
      if (serv) html += `
        <tr>
          <td class="first-col">지원 내용</td>
          <td>${serv}</td>
        </tr>`;
      if (fee) html += `
        <tr>
          <td class="first-col">이용료</td>
          <td>${fee}</td>
        </tr>`;
    html += '</table>';
  
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
        const marker = L.marker(latlng, { icon: icon });
        marker.feature = feature;  // 마커에 type 정보를 저장 (필터용)
        markers.push(marker);      // 배열에 마커 저장
        return marker;
      },
      onEachFeature: function (feature, layer) {
        const p = feature.properties;
        let popup = `<div class="custom-popup">`;
        if (p.type) popup += `<span class="popup-type"style="color:${p.color}">${p.type}</span>`;
        if (p.name) popup += `<span class="popup-name">${p.name}</span><br>`;
        if (p.adrs) popup += `<span class="popup-adrs">${p.adrs}</span>`;
        popup += `<hr style="border: solid 0.5px #dedede; "></hr>`;
        if (p.phone) popup += `<span class="popup-phone"><b style="font-weight: 700; font-size: 90%; position: relative; top: -1px">• 연락처</b> ${p.phone}</span>`;
        if (p.sem_t) popup += `<span class="popup-time"><b style="font-weight: 700; font-size: 90%; position: relative; top: -1px">• 학기중</b> ${p.sem_t}</span>`;
        if (p.vac_t) popup += `<span class="popup-time"><b style="font-weight: 700; font-size: 90%; position: relative; top: -1px">• 방학중</b> ${p.vac_t}</span>`;
        if (p.time) popup += `<span class="popup-time"><b style="font-weight: 700; font-size: 90%; position: relative; top: -1px">• 운영 시간</b> ${p.time}</span>`;
        popup += `<button class="popup-more" data-type="${p.type}">더보기</button><br>`;
        popup += `</div>`;
        layer.bindPopup(popup);

        layer.on('popupopen', () => {
          const btn = document.querySelector('.popup-more');
          if (btn) {
            btn.addEventListener('click', () => {
              const type = btn.dataset.type;
              const { trgt, desc, serv, fee } = legendMap[type] || {};
              showTypeInfo(type, trgt, desc, serv, fee);
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
  document.querySelector('.legend-bar')?.classList.add('slide-out');
  clearTimeout(hideTimer);
});
map.on('moveend zoomend dragend', () => {
  hideTimer = setTimeout(() => {
    document.querySelector('.legend-bar')?.classList.remove('slide-out');
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

function filterMarkersByType(type) { // 마커 필터링 함수
  markers.forEach(marker => {
    const markerType = marker.feature.properties.type;
    if (type === null || markerType === type) {
      map.addLayer(marker);
    } else {
      map.removeLayer(marker);
    }
  });
}

// 도움말 팝업창 내용 불러오기
const helpSheetId = '1ZTUWQ7A1WOKYwz4jz5Q09JaxKwdP-cZ_tK8EnupkMMI';
const helpGid = '1804558100';
const helpUrl = `https://docs.google.com/spreadsheets/d/${helpSheetId}/gviz/tq?tqx=out:json&gid=${helpGid}`;

fetch(helpUrl)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    if (rows.length > 0) {
      const c = rows[1].c; // 첫 번째 줄
      const title = c[0]?.v || '';
      const updateDate = c[1]?.v || '';
      const helpTitle = c[2]?.v || '';
      const helpSubtitle = c[3]?.v || '';
      const helpContent = c[4]?.v || '';
      const contact = c[5]?.v || '';
      const download = c[6]?.v || '';
      const downloadlink = c[7]?.v || '';

      const modalBody = document.getElementById('help-modal-body');

      let html = '';
      if (helpTitle) html += `<h2>${helpTitle}</h2>`;
      if (helpSubtitle) html += `<p>${helpSubtitle}</p>`;
      if (helpContent) html += `<p style="font-size: 12px">${helpContent}</p>`;
      if (contact) html += `<p style="font-size: 11px; color: gray;">※ 문의 및 오류신고: ${contact}</p>`;
      if (updateDate) html += `<p style="font-size: 11px; color: gray;">※ 최근 업데이트: ${updateDate}</p>`;
      if (download) html += `<div class="modal-download-button"><a href=${downloadlink} target="_blank" style="color: black; text-decoration: none;">${download}</a></div>`;
      modalBody.innerHTML = html;
    }
  })
  .catch(err => console.error('Help Sheet fetch error:', err));

//인트로 툴팁
window.addEventListener('DOMContentLoaded', () => {
  // 0.5초 지연 후 툴팁 표시
  setTimeout(() => {
    const legendTooltip = document.getElementById('legend-tooltip');
    const mapTooltip = document.getElementById('map-tooltip');
  
    legendTooltip?.classList.remove('hidden');
    mapTooltip?.classList.remove('hidden');
  
    // 다음 프레임에 .show 추가 (transition이 먹으려면 렌더링 이후 추가해야 함)
    requestAnimationFrame(() => {
      legendTooltip?.classList.add('show');
      mapTooltip?.classList.add('show');
    });
  }, 500);
  
  // 닫기 버튼 연결
  document.querySelectorAll('.tooltip-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.getAttribute('data-target');
      const el = document.getElementById(targetId);
      if (!el) return;

      el.classList.remove('show'); // fade-out 시작

      const handleTransitionEnd = () => {
        el.classList.add('hidden'); // fade-out 후 완전히 숨김
        el.removeEventListener('transitionend', handleTransitionEnd);
      };
      el.addEventListener('transitionend', handleTransitionEnd);
    });
  });
});