const easing = 'cubic-bezier(.2,.8,.2,1)';
const doneTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export type RollMemory = Map<string, {text: string; at: number}>;

function firstNumber(text: string): number {
  const number = text.match(/∞|[+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)/)?.[0];
  if (number === '∞') return Infinity;
  const value = parseFloat(number?.replace(/,/g, '') ?? '');
  // 거리 표시가 cm↔m로 바뀌어도 방향이 맞도록 m 기준으로 맞춘다.
  return /\d\s*cm\b/.test(text) ? value / 100 : value;
}

export function rollText(el: HTMLElement, key: string, memory: RollMemory, now: number = Date.now()): boolean {
  const text = el.textContent ?? '';
  const previous = memory.get(key);
  if (!previous) {
    memory.set(key, {text, at: -Infinity});
    return false;
  }
  if (previous.text === text) return false;
  if (prefersReducedMotion() || now - previous.at < 160) {
    previous.text = text;
    return false;
  }

  const before = firstNumber(previous.text);
  const after = firstNumber(text);
  const up = Number.isNaN(before) || Number.isNaN(after) || after > before;
  el.dataset.pfmRoll = up ? 'up' : 'down';
  el.animate?.([
    {transform: up ? 'translateY(0.35em)' : 'translateY(-0.35em)', opacity: .35},
    {transform: 'none', opacity: 1},
  ], {duration: 160, easing});
  memory.set(key, {text, at: now});
  return true;
}

export function detentTick(previous: number, next: number): boolean {
  if (previous === next || prefersReducedMotion()) return false;
  navigator.vibrate?.(8);
  return true;
}

export function flashDone(button: HTMLButtonElement, label: string = '저장됨', ms: number = 1400): void {
  const timer = doneTimers.get(button);
  if (timer !== undefined) clearTimeout(timer);
  const originalLabel = button.dataset.pfmLabel ?? button.textContent ?? '';
  button.dataset.pfmLabel = originalLabel;
  button.dataset.pfmDone = 'true';
  button.textContent = `✓ ${label}`;
  pressPop(button);

  doneTimers.set(button, setTimeout(() => {
    button.textContent = originalLabel;
    delete button.dataset.pfmDone;
    delete button.dataset.pfmLabel;
    doneTimers.delete(button);
  }, ms));
}

export function holdToConfirm(button: HTMLButtonElement, onConfirm: () => void, ms: number = 600, signal?: AbortSignal): void {
  button.dataset.pfmHold = 'true';
  button.style.setProperty('--pfm-hold-ms', `${ms}ms`);
  button.setAttribute('aria-description', '길게 눌러 삭제');

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pointer: number | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pointer = undefined;
    delete button.dataset.pfmHolding;
  };
  // 화면을 다시 그리거나 뷰를 닫으면(signal abort) 누르던 중의 타이머도 함께 취소한다.
  signal?.addEventListener('abort', cancel);
  const options = signal ? {signal} : undefined;
  // 처음 누른 손가락의 떼기·취소만 받아, 다른 손가락 때문에 확인이 끊기지 않게 한다.
  const release = (event: Event) => {
    const id = (event as PointerEvent).pointerId;
    if (pointer !== undefined && id !== undefined && id !== pointer) return;
    cancel();
  };
  button.addEventListener('pointerdown', event => {
    if ((event.button !== 0 && event.button !== undefined) || timer !== undefined) return;
    pointer = event.pointerId;
    // 터치가 버튼 밖으로 이동할 때도 pointerleave가 전달되게 한다.
    if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
    button.dataset.pfmHolding = 'true';
    timer = setTimeout(() => {
      timer = undefined;
      pointer = undefined;
      delete button.dataset.pfmHolding;
      if (signal?.aborted || !button.isConnected) return;
      onConfirm();
      if (!prefersReducedMotion()) navigator.vibrate?.(12);
    }, ms);
  }, options);
  button.addEventListener('pointerup', release, options);
  button.addEventListener('pointerleave', release, options);
  button.addEventListener('pointercancel', release, options);
  button.addEventListener('click', event => {
    if (event.detail !== 0) return;
    cancel();
    onConfirm();
  }, options);
  button.addEventListener('contextmenu', event => {
    if (timer !== undefined) event.preventDefault();
  }, options);
}

export type SlideMemory = Map<string, {left: number; top: number; width: number; height: number}>;

export function slideGhost(group: HTMLElement, key: string, memory: SlideMemory): boolean {
  const button = group.querySelector('button[aria-pressed="true"]');
  if (!button) return false;
  const bounds = group.getBoundingClientRect();
  const {left, top, width, height} = button.getBoundingClientRect();
  const next = {left: left - bounds.left, top: top - bounds.top, width, height};
  const previous = memory.get(key);
  memory.set(key, next);
  if (!previous || prefersReducedMotion() || (
    Math.abs(previous.left - next.left) <= .5 && Math.abs(previous.top - next.top) <= .5 &&
    Math.abs(previous.width - next.width) <= .5 && Math.abs(previous.height - next.height) <= .5
  )) return false;

  const ghost = group.ownerDocument.createElement('span');
  ghost.className = 'pfm-slide-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    left: `${previous.left}px`, top: `${previous.top}px`,
    width: `${previous.width}px`, height: `${previous.height}px`,
  });
  group.append(ghost);
  const animation = ghost.animate?.([
    {transform: 'none', width: ghost.style.width, height: ghost.style.height, opacity: .35},
    {
      transform: `translate(${next.left - previous.left}px, ${next.top - previous.top}px)`,
      width: `${next.width}px`, height: `${next.height}px`, opacity: 0,
    },
  ], {duration: 180, easing});
  if (animation) animation.onfinish = animation.oncancel = () => ghost.remove();
  else setTimeout(() => ghost.remove(), 250);
  return true;
}

export function pressPop(el: HTMLElement): boolean {
  if (prefersReducedMotion()) return false;
  el.animate?.([{transform: 'scale(.94)'}, {transform: 'scale(1)'}], {duration: 140, easing});
  return true;
}
