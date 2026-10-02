// Resolve rgb(), color-mix() and inherited palette variables before passing them to SVG.
export function readTheme(element) {
  const probe=document.createElement('span');
  probe.style.display='none';element.append(probe);
  const resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};
  const colors=Array.from({length:6},(_,i)=>resolve(`var(--cgw-chart-${i+1})`));
  const result={colors,text:resolve('rgb(var(--mist))'),muted:resolve('rgb(var(--mist-muted))'),
    border:resolve('rgb(var(--ink-700))'),surface:resolve('rgb(var(--ink-850))'),
    success:resolve('rgb(var(--cgw-success))'),danger:resolve('rgb(var(--cgw-danger))'),
    fontFamily:getComputedStyle(element).fontFamily};
  probe.remove();return result;
}
