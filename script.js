(()=>{
    const canvas=document.getElementById('game');
    const ctx=canvas.getContext('2d');
    const overlay=document.getElementById('overlay');
    const message=document.getElementById('message');
    const startBtn=document.getElementById('startButton');

    const W=canvas.width,H=canvas.height;

    /* Audio */
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    function beep(f,d=0.05,t='square',v=0.15){if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);o.onended=()=>{o.disconnect();g.disconnect();};}

    /* Game vars */
    let paddle,balls,bricks,particles=[],items=[];
    let score=0,highScore=Number(localStorage.getItem('breakoutHighScore'))||0;
    let lives=3,stage=1,running=false,ballAttached=true;
    let leftPressed=false,rightPressed=false;

    /* Const */
    const ROWS=5,COLS=10,BRICK_W=70,BRICK_H=20,BRICK_PADDING=10,OFFSET_TOP=60;
    const PADDLE_W_DEFAULT=120,PADDLE_H=16,PADDLE_Y=H-40;
    const BALL_RADIUS=8,BALL_SPEED=5,PADDLE_SPEED=8;
    const PARTICLE_CNT=8,PARTICLE_LIFE=30;
    const ITEM_SIZE=12,ITEM_SPEED=3,ITEM_CHANCE=0.2;
    const itemTypes={
      PADDLE_WIDEN:{color:'#6f6',symbol:'W'},
      MULTI_BALL:{color:'#f99',symbol:'M'},
    };

    /* Build bricks */
    function buildBricks(){const tot=COLS*BRICK_W+(COLS-1)*BRICK_PADDING,off=(W-tot)/2;bricks=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>({x:off+c*(BRICK_W+BRICK_PADDING),y:OFFSET_TOP+r*(BRICK_H+BRICK_PADDING),status:1})))}

    function resetBall(){balls=[{x:paddle.x+paddle.w/2,y:PADDLE_Y-BALL_RADIUS,dx:BALL_SPEED,dy:-BALL_SPEED}];ballAttached=true;paddle.w=PADDLE_W_DEFAULT;}

    function newGame(){score=0;lives=3;stage=1;leftPressed=rightPressed=false;paddle={x:(W-PADDLE_W_DEFAULT)/2,w:PADDLE_W_DEFAULT,h:PADDLE_H};resetBall();buildBricks();particles=[];items=[];running=true;overlay.hidden=true;requestAnimationFrame(loop);}

    /* Stage clear */
    function stageClear(){score+=100;lives++;stage++;buildBricks();resetBall();items=[];beep(1000,0.3,'triangle');}

    /* Particles */
    function spawnParticles(x,y){for(let i=0;i<PARTICLE_CNT;i++){const a=Math.random()*Math.PI*2,s=Math.random()*3+1;particles.push({x,y,dx:Math.cos(a)*s,dy:Math.sin(a)*s,life:PARTICLE_LIFE});}}
    function updateParticles(){particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.dx;p.y+=p.dy;p.dy+=0.05;p.life--;ctx.fillStyle=`rgba(255,255,0,${p.life/PARTICLE_LIFE})`;ctx.fillRect(p.x,p.y,2,2);});}

    /* Items */
    function spawnItem(x,y){if(Math.random()>ITEM_CHANCE)return;const typeKeys=Object.keys(itemTypes);const type=typeKeys[Math.floor(Math.random()*typeKeys.length)];items.push({x,y,type});}
    function updateItems(){items=items.filter(i=>i.y<H);for(const item of items){item.y+=ITEM_SPEED;if(item.y+ITEM_SIZE>PADDLE_Y&&item.x>paddle.x&&item.x<paddle.x+paddle.w){applyItemEffect(item.type);items=items.filter(i2=>i2!==item);beep(900,0.1,'sine');}}}
    function applyItemEffect(type){if(type==='PADDLE_WIDEN'){paddle.w=Math.min(W,paddle.w+40);setTimeout(()=>paddle.w=PADDLE_W_DEFAULT,8000);}else if(type==='MULTI_BALL'){const newBall={...balls[0]};newBall.dx*=-1;balls.push(newBall);}}
    function drawItems(){items.forEach(i=>{const def=itemTypes[i.type];ctx.fillStyle=def.color;ctx.fillRect(i.x,i.y,ITEM_SIZE,ITEM_SIZE);ctx.fillStyle='#000';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(def.symbol,i.x+ITEM_SIZE/2,i.y+ITEM_SIZE/2+1);});ctx.textAlign='left';ctx.textBaseline='alphabetic';}

    /* Draw */
    function drawBricks(){bricks.forEach(row=>row.forEach(b=>{if(b.status){ctx.fillStyle=`hsl(${(b.y/ROWS)*100},80%,50%)`;ctx.fillRect(b.x,b.y,BRICK_W,BRICK_H);}}));}
    const drawPaddle=()=>{ctx.fillStyle='#0f9';ctx.fillRect(paddle.x,PADDLE_Y,paddle.w,paddle.h);} ;
    const drawBalls=()=>{balls.forEach(ball=>{ctx.beginPath();ctx.arc(ball.x,ball.y,BALL_RADIUS,0,Math.PI*2);ctx.fillStyle='#f60';ctx.fill();})};
    function drawHUD(){ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText(`SCORE: ${score}`,20,24);ctx.fillText(`HIGH: ${highScore}`,W-150,24);ctx.fillText(`LIVES: ${lives}`,20,46);ctx.fillText(`STAGE: ${stage}`,W-150,46);} 

    /* Collision & Win */
    function collision(){for(const ball of balls){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const b=bricks[r][c];if(!b.status)continue;if(ball.x>b.x&&ball.x<b.x+BRICK_W&&ball.y-BALL_RADIUS<b.y+BRICK_H&&ball.y+BALL_RADIUS>b.y){ball.dy=-ball.dy;b.status=0;score+=10;spawnParticles(b.x+BRICK_W/2,b.y+BRICK_H/2);spawnItem(b.x+BRICK_W/2,b.y+BRICK_H/2);beep(800,0.05,'sawtooth');if(bricks.flat().every(v=>!v.status))stageClear();return;}}
      if(!ballAttached&&ball.x>paddle.x&&ball.x<paddle.x+paddle.w&&ball.y+BALL_RADIUS>PADDLE_Y&&ball.y-BALL_RADIUS<PADDLE_Y+PADDLE_H){const rel=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);ball.dx=BALL_SPEED*rel;ball.dy=-Math.abs(ball.dy);beep(500,0.04,'square');}}}

    /* End */
    function gameOver(){running=false;highScore=Math.max(highScore,score);localStorage.setItem('breakoutHighScore',highScore);ctx.clearRect(0,0,W,H);drawBricks();drawHUD();message.innerHTML='<b>GAME OVER</b><br>Press Space / Enter to restart';startBtn.textContent='Restart';overlay.hidden=false;items=[];}

    /* Main loop */
    function loop(){if(!running)return;ctx.clearRect(0,0,W,H);drawBricks();drawPaddle();drawHUD();updateParticles();drawItems();updateItems();if(leftPressed&&!rightPressed)paddle.x=Math.max(0,paddle.x-PADDLE_SPEED);if(rightPressed&&!leftPressed)paddle.x=Math.min(W-paddle.w,paddle.x+PADDLE_SPEED);
      if(ballAttached){balls[0].x=paddle.x+paddle.w/2;balls[0].y=PADDLE_Y-BALL_RADIUS;}else{balls.forEach(ball=>{ball.x+=ball.dx;ball.y+=ball.dy;});}
      drawBalls();collision();for(let i=balls.length-1;i>=0;i--){const ball=balls[i];if(!ballAttached){if(ball.x+BALL_RADIUS>W||ball.x-BALL_RADIUS<0){ball.dx=-ball.dx;beep(350,0.03);}if(ball.y-BALL_RADIUS<0){ball.dy=-ball.dy;beep(350,0.03);}}
      if(!ballAttached&&ball.y+BALL_RADIUS>H){if(balls.length>1){balls.splice(i,1);}else{lives--;if(lives>0){resetBall();beep(250,0.2);}else gameOver();}}}
      requestAnimationFrame(loop);} 

    /* Keyboard & Mouse */
    document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')leftPressed=true;else if(e.key==='ArrowRight')rightPressed=true;else if(e.key===' '||e.key==='Enter'){if(overlay.hidden){if(ballAttached){ballAttached=false;beep(600,0.05,'triangle');}}else{startBtn.click();}}});
    document.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')leftPressed=false;if(e.key==='ArrowRight')rightPressed=false;});
    document.addEventListener('mousemove',e=>{if(!paddle)return;const rect=canvas.getBoundingClientRect();paddle.x=Math.max(0,Math.min(W-paddle.w,e.clientX-rect.left-paddle.w/2));});
    canvas.addEventListener('click',()=>{if(running&&ballAttached){ballAttached=false;beep(600,0.05,'triangle');}});
    startBtn.addEventListener('click',()=>{overlay.hidden?null:newGame();});
  })();