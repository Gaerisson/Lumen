const fs = require('fs'), path = require('path');
async function build() {
  const out = path.resolve(__dirname, process.env.LUMEN_OUTPUT||'dist/Lumen');
  const runtime = path.join(__dirname, 'node_modules/electron/dist');
  const updating=process.argv.includes('--update');
  if (fs.existsSync(path.join(out, 'Lumen.exe'))&&!updating) throw Error('Le dossier de sortie contient déjà un exécutable. Fermer Lumen puis utiliser --update.');
  fs.mkdirSync(out, { recursive: true });
  if(!updating)fs.cpSync(runtime, out, { recursive: true, filter: source => {
    const relative = path.relative(runtime, source);
    return relative !== 'data' && !relative.startsWith('data' + path.sep);
  } });
  const appDir = path.join(out, 'resources/app');
  fs.mkdirSync(appDir, { recursive: true });
  const files = ['main.js','layout.js','preload.js','quota-source.js','quota-ui.js','index.html','renderer.js','style.css',
    'widget.html','widget.css','widget.js','themes.js','themes.css','unavailable.html','unavailable.js','icon.ico','icon.png','smoke.js',
    'home-assistant.js','activity.js','integrations.js','audio.js','dashboard.js','dashboard.css','shell.html','shell.css','shell.js','settings-v2.js','settings-v2.css','morning-motion.css','nas.js','configurable.js','options.css','masonry.js','house-engine.js','brightness.js','v3-ui.js','v3.css','routines-settings.js','alert-audio.js','quota-panel.js','quota-panel.css','stream-player.js','stream-watch.js','composer-math.js','composer.js','composer.css','v4-settings.js','v4-views.js','v4.css'];
  files.push('effect-audit.js','modules.js','telemetry.js','remote.js','agent.cjs','quota-rest.js','spotify.js','standby-host.js','spotify-settings.js','spotify-settings.css','audio-sources.js','audio-sources.css','module-ui.js','module-ui.css','modules-settings.js','modules-settings.css','entity-picker.js','v67-smoke.js','power-reading.js','power-ui.js','screen-refinement.css','v66-smoke.js','home-screen.js','quota-live.js','standby-state.js','v651-smoke.js','work-presence.js','work-presence.css','surface-scheduler.js','v64-smoke.js','motion-ui.js','motion.css','v62-smoke.js','notification-tones.js','detection-chime.js','tone-preview.js','settings-shell.js','settings-shell.css','v61-smoke.js','compact-camera.css','focus-layout.js','camera-shots.css','radio.js','morning-playback.js','live-dom.js','network-math.js','v6.css','camera-focus.js','camera-focus.html','camera-focus.css','camera-focus-ui.js','outdoor-watch.js','outdoor-settings.js','v6-smoke.js','v4-smoke.js','network.js','network-ui.js','network.css','standby-policy.js','ambient-ui.js','ambient.css','ambient-settings.js','v5-smoke.js');
  fs.rmSync(path.join(appDir,'resume-manager.js'),{force:true});
  for (const file of files) fs.copyFileSync(path.join(__dirname,file), path.join(appDir,file));
  fs.writeFileSync(path.join(appDir,'package.json'), JSON.stringify({name:'lumen-desktop',productName:'Lumen',version:'7.1.0',main:'main.js'}));
  fs.cpSync(path.join(__dirname,'node_modules/ws'),path.join(appDir,'node_modules/ws'),{recursive:true});
  fs.rmSync(path.join(out,'resources/default_app.asar'), { force:true });
  if(!updating)fs.renameSync(path.join(out,'electron.exe'), path.join(out,'Lumen.exe'));
  const { rcedit } = await import('rcedit');
  await rcedit(path.join(out,'Lumen.exe'), {
    'icon': path.join(__dirname,'icon.ico'), 'file-version':'7.1.0.0','product-version':'7.1.0.0',
    'version-string':{ProductName:'Lumen',FileDescription:'Lumen · Bureau multi-écrans',CompanyName:'Lumen',OriginalFilename:'Lumen.exe'},
    'requested-execution-level':'asInvoker'
  });
  for(const file of['LISEZ-MOI.md','README.md','SECURITY.md','THIRD_PARTY_NOTICES.md','LICENSE'])fs.copyFileSync(path.join(__dirname,file),path.join(out,file));if(fs.existsSync(path.join(__dirname,'docs')))fs.cpSync(path.join(__dirname,'docs'),path.join(out,'docs'),{recursive:true});
  console.log('Construit : '+path.join(out,'Lumen.exe'));
}
build().catch(e=>{console.error(e);process.exitCode=1;});
