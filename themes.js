const lumenThemes = [
  {id:'glass-ocean',name:'Glass Océan',note:'Verre · bleu arctique',color:'#8bdced',bg:'#082c41'},
  {id:'glass-rose',name:'Glass Rosé',note:'Verre · soie & prune',color:'#e8b2c9',bg:'#382136'},
  {id:'noir',name:'Noir',note:'OLED · lumière minimale',color:'#c7d6ce',bg:'#050607'},
  { id: 'jade', name: 'Jade', note: 'Calme & végétal', color: '#a4d7c1', bg: '#12261f' },
  { id: 'midnight', name: 'Minuit', note: 'Bleu profond', color: '#aebcff', bg: '#1e2142' },
  { id: 'amber', name: 'Ambre', note: 'Chaleur du soir', color: '#e8bc85', bg: '#38271c' },
  { id: 'glass-aurora', name: 'Glass Boréal', note: 'Verre · aurore', color: '#b5e9d8', bg: '#24494c' },
  { id: 'glass-smoke', name: 'Glass Fumé', note: 'Verre · graphite', color: '#d0cfdf', bg: '#363342' }
];
function applyTheme(theme = 'glass-aurora', night = false) {
  const selected=lumenThemes.some(t => t.id === theme) ? theme : 'glass-aurora';
  if(document.body.dataset.theme!==selected)document.body.dataset.theme=selected;
  // Standby owns its night palette: never toggle compositor brightness on polling.
  document.body.classList.toggle('night', !!night&&!document.body.matches('.standby,.alert'));
}
window.lumen?.onAppearance?.(appearance => applyTheme(appearance.theme, appearance.night));
