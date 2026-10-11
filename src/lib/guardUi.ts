/** Empêche le menu Inspecter / les raccourcis DevTools (prod uniquement). */
export function guardInspect() {
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener('contextmenu', block, true);
  document.addEventListener(
    'keydown',
    (event) => {
      const key = event.key.toLowerCase();
      const inspect =
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && key === 'u') ||
        (event.metaKey && event.altKey && key === 'u');
      if (inspect) block(event);
    },
    true,
  );
}
