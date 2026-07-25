// 대형 디스플레이 타이틀이 컨테이너보다 넓으면(keep-all로 어절을 지키는 대신
// 긴 어절이 넘칠 수 있다) 폰트 크기를 줄여 맞춘다. 리사이즈와 폰트 로드 후
// 다시 계산한다.
const registered = new Set();

function fit(element, minPx) {
  element.style.fontSize = "";
  const base = parseFloat(getComputedStyle(element).fontSize);
  if (!base || element.clientWidth === 0) return;
  let size = base;
  for (let i = 0; i < 4 && element.scrollWidth > element.clientWidth + 1 && size > minPx; i++) {
    size = Math.max(minPx, Math.floor((size * element.clientWidth) / element.scrollWidth));
    element.style.fontSize = `${size}px`;
  }
}

function refitAll() {
  for (const { element, minPx } of registered) {
    if (element.isConnected) fit(element, minPx);
  }
}

let bound = false;
export function fitTitle(element, { min = 34 } = {}) {
  if (!element) return;
  registered.add({ element, minPx: min });
  fit(element, min);
  if (!bound) {
    bound = true;
    let frame = 0;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refitAll);
    });
    document.fonts?.ready?.then(refitAll);
  }
}
