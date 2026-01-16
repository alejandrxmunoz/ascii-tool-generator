// =====================================================
// ASCII TOOL ART GENERATOR — v1.0.4
// =====================================================

// ---------- CONFIG ----------
const ASCII_SETS = {
  refined: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  blocks_dense: "█▉▊▋▌▍▎▏▐░▒▓ ",
  minimal: " .:-=+*#%@",
  tech: "01█▓▒░:.+=*#%&@"
};

const RESOLUTION_MAP = {
  tiny: 6,
  small: 8,
  medium: 12,
  large: 16,
  ultra: 24
};

// Presets de color
const COLOR_PRESETS = {
  classic_bw: { name: 'Classic B/W', background: '#000000', chars: '#ffffff' },
  paper_ink: { name: 'Paper & Ink', background: '#f4f1ec', chars: '#1a1a1a' },
  risograph_blue: { name: 'Risograph Blue', background: '#f7f6f3', chars: '#0047ab' },
  risograph_red: { name: 'Risograph Red', background: '#f7f6f3', chars: '#c1121f' },
  night_poster: { name: 'Night Poster', background: '#0b0e14', chars: '#e6e1cf' }
};

// Imágenes de muestra
const SAMPLE_IMAGES = [
  'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1191727/pexels-photo-1191727.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1591407/pexels-photo-1591407.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/207962/pexels-photo-207962.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800'
];

// ---------- STATE ----------
const state = {
  image: null,
  asciiType: 'refined',
  resolution: 'medium',
  invert: false,
  brightness: 0,
  contrast: 0,
  hue: 0,
  backgroundColor: '#000000',
  charactersColor: '#ffffff',
  zoom: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
  pan: { x: 0, y: 0 },
  isPanning: false,
  lastMouse: { x: 0, y: 0 },
  asciiText: '',
  highResCanvas: null,
  webcamStream: null,
  webcamVideo: null,
  webcamActive: false
};

// ---------- DOM ----------
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// ---------- CANVAS ----------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (state.highResCanvas) renderView();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------- TOAST ----------
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.style.background =
    type === 'error' ? '#c94a4a' :
    type === 'warning' ? '#d1a21f' :
    '#4caf50';
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = 1);
  setTimeout(() => {
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

// ---------- UTILS ----------
const luminance = (r,g,b) => 0.2126*r + 0.7152*g + 0.0722*b;
function applyBC(v){
  const b = state.brightness / 100;
  const c = state.contrast / 100 + 1;
  let n = ((v / 255 - 0.5) * c + 0.5 + b) * 255;
  return Math.max(0, Math.min(255, n));
}

// ---------- DRAG & DROP ----------
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

canvas.addEventListener('drop', e => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (!files.length) return;

  for (let f of files) {
    if (f.type.match(/image\/(png|jpeg|jpg|svg|webp)/)) {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        renderASCII();
        renderView();
        showToast(`Imagen ${f.name} cargada.`, 'success');
      };
      img.onerror = () => showToast(`Error al cargar ${f.name}.`, 'error');
      img.src = URL.createObjectURL(f);
    } else {
      showToast(`Formato no soportado: ${f.name}`, 'error');
    }
  }
});

// ---------- LOAD IMAGE ----------
function loadImage(img){
  state.image = img;
  renderASCII();
  renderView();
}

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  if (!f.type.match(/image\/(png|jpeg|jpg|svg|webp)/)) {
    showToast('Formato no admitido', 'error');
    return;
  }
  if (f.size > 4 * 1024 * 1024) {
    showToast('Imagen mayor a 4MB', 'warning');
  }
  const img = new Image();
  img.onload = () => loadImage(img);
  img.src = URL.createObjectURL(f);
});

function loadRandomSampleImage() {
  const randomUrl = SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)];
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.image = img;
    renderASCII();
    renderView();
    showToast('Imagen de muestra cargada.', 'success');
  };
  img.onerror = () => {
    
    const fallback = document.createElement('canvas');
    fallback.width = 600;
    fallback.height = 400;
    const c = fallback.getContext('2d');
    c.fillStyle = '#333';
    c.fillRect(0, 0, 600, 400);
    c.fillStyle = '#fff';
    c.font = '20px IBM Plex Mono';
    c.textAlign = 'center';
    c.fillText('Sample image', 300, 200);
    state.image = new Image();
    state.image.src = fallback.toDataURL();
    renderASCII();
    renderView();
    showToast('Imagen de muestra cargada (fallback).', 'success');
  };
  img.src = randomUrl;
}

// ---------- ASCII RENDER ----------
function renderASCII(){
  if (!state.image) return;

  const img = state.image;
  const charSize = RESOLUTION_MAP[state.resolution];
  const cols = Math.ceil(img.width / charSize);
  const rows = Math.ceil(img.height / charSize);

  const off = document.createElement('canvas');
  off.width = img.width;
  off.height = img.height;
  const octx = off.getContext('2d');

  if (state.backgroundColor !== 'transparent') {
    octx.fillStyle = state.backgroundColor;
    octx.fillRect(0,0,off.width,off.height);
  }

  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d').drawImage(img,0,0);
  const data = tmp.getContext('2d')
    .getImageData(0,0,img.width,img.height).data;

  octx.font = `${charSize}px IBM Plex Mono, monospace`;
  octx.textBaseline = 'top';
  octx.fillStyle = state.charactersColor;

  const charset = ASCII_SETS[state.asciiType];
  let text = '';

  for (let y=0;y<rows;y++){
    let line='';
    for (let x=0;x<cols;x++){
      let sum=0,cnt=0;
      for (let dy=0;dy<charSize;dy++){
        for (let dx=0;dx<charSize;dx++){
          const px=x*charSize+dx;
          const py=y*charSize+dy;
          if(px<img.width && py<img.height){
            const i=(py*img.width+px)*4;
            sum+=luminance(data[i],data[i+1],data[i+2]);
            cnt++;
          }
        }
      }
      let v=applyBC(cnt?sum/cnt:0);
      let n=state.invert?1-v/255:v/255;
      const ch=charset[Math.floor(n*(charset.length-1))];
      line+=ch;
    }
    octx.fillText(line,0,y*charSize);
    text+=line+'\n';
  }

  state.highResCanvas = off;
  state.asciiText = text;
}

// ---------- VIEW RENDER ----------
function renderView(){
  if(!state.highResCanvas) return;

  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.scale(state.zoom,state.zoom);
  ctx.translate(state.pan.x/state.zoom,state.pan.y/state.zoom);
  ctx.rotate(state.rotation*Math.PI/180);
  ctx.scale(state.flipX?-1:1,state.flipY?-1:1);
  ctx.drawImage(
    state.highResCanvas,
    -state.highResCanvas.width/2,
    -state.highResCanvas.height/2
  );
  ctx.restore();
}

// ---------- INTERACTION ----------
canvas.addEventListener('mousedown',e=>{
  state.isPanning=true;
  state.lastMouse={x:e.clientX,y:e.clientY};
});
window.addEventListener('mouseup',()=>state.isPanning=false);
window.addEventListener('mousemove',e=>{
  if(!state.isPanning) return;
  state.pan.x+=e.clientX-state.lastMouse.x;
  state.pan.y+=e.clientY-state.lastMouse.y;
  state.lastMouse={x:e.clientX,y:e.clientY};
  renderView();
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  state.zoom=Math.min(4,Math.max(0.5,state.zoom-e.deltaY*0.001));
  renderView();
});
canvas.addEventListener('dblclick',()=>{
  state.zoom=1;
  state.pan={x:0,y:0};
  state.rotation=0;
  renderView();
});

// ---------- EXPORT ----------
function exportImage(format){
  if(!state.highResCanvas) return;
  const a=document.createElement('a');
  a.download=`ascii-${Date.now()}.${format}`;

  if(format==='txt'){
    a.href=URL.createObjectURL(
      new Blob([state.asciiText],{type:'text/plain'})
    );
  } else if(format==='svg'){
    const size=RESOLUTION_MAP[state.resolution];
    const lines=state.asciiText.split('\n').filter(Boolean);
    const w=Math.max(...lines.map(l=>l.length))*size;
    const h=lines.length*size;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:${state.backgroundColor}">`;
    svg+=`<style>text{font-family:IBM Plex Mono,monospace;font-size:${size}px;fill:${state.charactersColor}}</style>`;
    lines.forEach((l,i)=>{
      svg+=`<text x="0" y="${(i+1)*size}">${l}</text>`;
    });
    svg+='</svg>';
    a.href=URL.createObjectURL(
      new Blob([svg],{type:'image/svg+xml'})
    );
  } else if(format==='png-transparent'){
    const c=document.createElement('canvas');
    c.width=state.highResCanvas.width;
    c.height=state.highResCanvas.height;
    const ct=c.getContext('2d',{alpha:true});
    ct.clearRect(0,0,c.width,c.height);
    ct.font = `${RESOLUTION_MAP[state.resolution]}px IBM Plex Mono, monospace`;
    ct.textBaseline = 'top';
    ct.fillStyle = state.charactersColor;
    const lines = state.asciiText.split('\n').filter(Boolean);
    for (let i=0;i<lines.length;i++) {
      ct.fillText(lines[i], 0, i * RESOLUTION_MAP[state.resolution]);
    }
    a.href=c.toDataURL('image/png');
  } else {
    a.href=state.highResCanvas.toDataURL(`image/${format}`);
  }
  a.click();
}

// ---------- WEBCAM ----------
function startWebcam(){
  navigator.mediaDevices.getUserMedia({video:true}).then(stream=>{
    state.webcamStream=stream;
    state.webcamVideo=document.createElement('video');
    state.webcamVideo.srcObject=stream;
    state.webcamVideo.play();
    state.webcamActive=true;

    const loop=()=>{
      if(!state.webcamActive) return;
      const t=document.createElement('canvas');
      t.width=640;t.height=480;
      t.getContext('2d').drawImage(state.webcamVideo,0,0);
      const img=new Image();
      img.onload=()=>loadImage(img);
      img.src=t.toDataURL('image/jpeg');
      setTimeout(loop,200);
    };
    loop();
  });
}
function stopWebcam(){
  state.webcamActive=false;
  if(state.webcamStream){
    state.webcamStream.getTracks().forEach(t=>t.stop());
    state.webcamStream=null;
  }
}

// ---------- APLICAR PRESET DE COLOR ----------
function applyColorPreset(key) {
  const preset = COLOR_PRESETS[key];
  if (preset) {
    state.backgroundColor = preset.background;
    state.charactersColor = preset.chars;
    renderASCII();
    renderView();
  }
}

// ---------- GUI ----------
const gui=new lil.GUI({title:'ASCII Tool',width:280});

// Load & Save
const load=gui.addFolder('Load & Save');
load.add({Upload:()=>fileInput.click()},'Upload').name('Upload');

const exportConfig = { format: 'png' };
const formatCtrl = load.add(exportConfig, 'format', ['png', 'png-transparent', 'jpg', 'svg', 'txt']);
const exportBtn = load.add({ Export: () => exportImage(exportConfig.format) }, 'Export');

formatCtrl.domElement.style.display = 'inline-block';
formatCtrl.domElement.style.width = '45%';
exportBtn.domElement.style.display = 'inline-block';
exportBtn.domElement.style.width = '50%';
exportBtn.domElement.style.marginLeft = '5%';

load.close();

// View
const view=gui.addFolder('View');
view.add(state,'zoom',0.5,4).onChange(renderView);
view.add(state,'rotation',-180,180).onChange(renderView);
view.add(state,'flipX').onChange(renderView);
view.add(state,'flipY').onChange(renderView);
view.close();

// Effect
const effect=gui.addFolder('Effect');
effect.add(state,'asciiType',['refined','blocks_dense','minimal','tech']).onChange(()=>{renderASCII();renderView();});
effect.add(state,'resolution',Object.keys(RESOLUTION_MAP)).onChange(()=>{renderASCII();renderView();});
effect.add(state,'invert').onChange(()=>{renderASCII();renderView();});
effect.close();

// Color
const color=gui.addFolder('Color');
color.add(state, 'brightness', -100, 100).step(1).onChange(() => { renderASCII(); renderView(); });
color.add(state, 'contrast', -100, 100).step(1).onChange(() => { renderASCII(); renderView(); });
color.add(state, 'hue', -180, 180).step(1).onChange(() => { renderASCII(); renderView(); });

const presetKeys = Object.keys(COLOR_PRESETS);
const presetNames = presetKeys.map(k => COLOR_PRESETS[k].name);
const presetMap = {};
presetKeys.forEach((k, i) => presetMap[presetNames[i]] = k);
color.add({ preset: 'Classic B/W' }, 'preset', presetNames).onChange(name => {
  const key = presetMap[name];
  applyColorPreset(key);
});

color.addColor(state,'backgroundColor').onChange(()=>{renderASCII();renderView();});
color.addColor(state,'charactersColor').name('Characters Color').onChange(()=>{renderASCII();renderView();});
color.close();

// Realtime
const realtime=gui.addFolder('Realtime');
realtime.add({Start:startWebcam},'Start');
realtime.add({Stop:stopWebcam},'Stop');
realtime.close();

// ---------- INICIO AUTOMÁTICO ----------
window.addEventListener('DOMContentLoaded', () => {
  showToast('Arrastre hasta el centro del canvas su imagen', 'info');
  loadRandomSampleImage();
});