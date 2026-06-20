const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

const W = canvas.width, H = canvas.height;
let running = false, paused = false, soundOn = true;
let score = 0, lives = 3, level = 1;
let leftHeld = false, rightHeld = false;
let particles = [];

const paddle = { w: 92, h: 16, x: W/2-46, y: H-58, speed: 7 };
const ball = { x: W/2, y: H-85, r: 8, dx: 3.1, dy: -4.5 };
let bricks = [];

let audioCtx;
function tone(freq=440, duration=.08, type='sine', gain=.05) {
  if (!soundOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const vol = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, audioCtx.currentTime);
  vol.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
  osc.connect(vol).connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}
function melodyWin(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.13,'triangle',.06), i*90)); }
function soundBrick(){ tone(740 + Math.random()*180, .07, 'triangle', .045); }
function soundPaddle(){ tone(280, .06, 'square', .035); }
function soundLose(){ [240,180,130].forEach((f,i)=>setTimeout(()=>tone(f,.12,'sawtooth',.04), i*80)); }

function makeBricks(){
  bricks = [];
  const rows = Math.min(4 + level, 8), cols = 7;
  const gap = 7, bw = (W - 36 - gap*(cols-1)) / cols, bh = 24;
  const palette = ['#ff6fae','#ff9f43','#ffd166','#55d6be','#5b8cff','#a16eff','#ff7a59','#71e6ff'];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      bricks.push({x:18+c*(bw+gap), y:92+r*(bh+gap), w:bw, h:bh, alive:true, color:palette[(r+c)%palette.length]});
    }
  }
}
function resetBall(){
  paddle.x = W/2 - paddle.w/2;
  ball.x = W/2; ball.y = H-85;
  const s = 4.5 + level*.25;
  ball.dx = (Math.random()>.5?1:-1)*(2.5 + level*.18);
  ball.dy = -s;
}
function newGame(){
  score = 0; lives = 3; level = 1; particles=[];
  makeBricks(); resetBall(); updateHud();
  running = true; paused = false; overlay.classList.add('hidden');
  tone(523,.09,'triangle'); setTimeout(()=>tone(784,.1,'triangle'),90);
  requestAnimationFrame(loop);
}
function updateHud(){ scoreEl.textContent=score; livesEl.textContent=lives; levelEl.textContent=level; }
function drawBg(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#6fd8ff'); g.addColorStop(.56,'#fff7cf'); g.addColorStop(1,'#ffd8ef');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.2;
  for(let i=0;i<18;i++){ ctx.beginPath(); ctx.arc((i*67)%W, 40+(i*83)%H, 12+(i%4)*6, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); }
  ctx.globalAlpha=1;
}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); }
function draw(){
  drawBg();
  bricks.forEach(b=>{ if(!b.alive) return; ctx.fillStyle=b.color; roundRect(b.x,b.y,b.w,b.h,10); ctx.fillStyle='rgba(255,255,255,.35)'; roundRect(b.x+5,b.y+4,b.w-10,6,8); });
  ctx.fillStyle='#29324a'; roundRect(paddle.x, paddle.y, paddle.w, paddle.h,10);
  ctx.fillStyle='#fff'; roundRect(paddle.x+12,paddle.y+3,paddle.w-24,4,8);
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.lineWidth=4; ctx.strokeStyle='#ff6fae'; ctx.stroke();
  particles.forEach(p=>{ ctx.globalAlpha=p.life/25; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
}
function sparkle(x,y,color){
  for(let i=0;i<10;i++) particles.push({x,y,dx:(Math.random()-.5)*5,dy:(Math.random()-.5)*5,r:2+Math.random()*3,life:25,color});
}
function step(){
  if(leftHeld) paddle.x -= paddle.speed;
  if(rightHeld) paddle.x += paddle.speed;
  paddle.x = Math.max(8, Math.min(W-paddle.w-8, paddle.x));

  ball.x += ball.dx; ball.y += ball.dy;
  if(ball.x < ball.r || ball.x > W-ball.r){ ball.dx *= -1; tone(420,.04,'sine',.025); }
  if(ball.y < ball.r){ ball.dy *= -1; tone(420,.04,'sine',.025); }
  if(ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y+paddle.h && ball.x > paddle.x && ball.x < paddle.x+paddle.w && ball.dy>0){
    const hit = (ball.x - (paddle.x+paddle.w/2))/(paddle.w/2);
    ball.dx = hit * (4.5 + level*.2);
    ball.dy *= -1;
    ball.y = paddle.y - ball.r;
    soundPaddle();
  }
  for(const b of bricks){
    if(!b.alive) continue;
    if(ball.x+ball.r>b.x && ball.x-ball.r<b.x+b.w && ball.y+ball.r>b.y && ball.y-ball.r<b.y+b.h){
      b.alive = false; ball.dy *= -1; score += 10*level; sparkle(ball.x, ball.y, b.color); soundBrick(); updateHud(); break;
    }
  }
  if(ball.y > H+20){
    lives--; updateHud(); soundLose();
    if(lives<=0){ endGame('아쉬워요!', '다시 도전하면 더 멀리 갈 수 있어요.'); return; }
    resetBall();
  }
  if(bricks.every(b=>!b.alive)){
    level++; score += 100; updateHud(); melodyWin(); makeBricks(); resetBall();
  }
  particles.forEach(p=>{ p.x+=p.dx; p.y+=p.dy; p.dy+=.08; p.life--; });
  particles = particles.filter(p=>p.life>0);
}
function endGame(title, msg){
  running=false; overlay.classList.remove('hidden');
  overlay.querySelector('h2').textContent = title;
  overlay.querySelector('p').innerHTML = `${msg}<br/>최종 점수: <b>${score}</b>`;
  startBtn.textContent = '다시 시작';
}
function loop(){
  if(!running) return;
  if(!paused) step();
  draw();
  requestAnimationFrame(loop);
}
function setPaddleFromPointer(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = (clientX - rect.left) / rect.width * W;
  paddle.x = x - paddle.w/2;
}
canvas.addEventListener('pointermove', setPaddleFromPointer);
canvas.addEventListener('pointerdown', e=>{ setPaddleFromPointer(e); if(!running) newGame(); });
startBtn.addEventListener('click', newGame);
pauseBtn.addEventListener('click', ()=>{ if(!running) return; paused=!paused; pauseBtn.textContent=paused?'계속하기':'일시정지'; tone(paused?180:520,.08,'triangle'); });
soundBtn.addEventListener('click', ()=>{ soundOn=!soundOn; soundBtn.textContent=soundOn?'🔊':'🔇'; if(soundOn) tone(660,.08,'triangle'); });
function hold(btn, flag){
  btn.addEventListener('pointerdown',()=>{ if(flag==='left') leftHeld=true; else rightHeld=true; });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,()=>{ if(flag==='left') leftHeld=false; else rightHeld=false; }));
}
hold(leftBtn,'left'); hold(rightBtn,'right');
makeBricks(); draw(); updateHud();
