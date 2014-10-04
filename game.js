'use strict';

var dim = calculateDimensions(20);

var canvas = getCanvas();
var context = getContexts();
var audioContext = getAudioContext();

window.addEventListener('resize', windowResized, false);
document.addEventListener('keydown', keyDown, false);
canvas[1].addEventListener('touchstart', touchStart, false);
canvas[1].addEventListener('mousedown', mouseDown, false);

var keyboardMap = [];

var nextDirs = [];

var head = {
    nextDir: 0,
    dir: 'right'
};

var parts = makeCat();
var fruits = [];

var gameStarted = false;
var gamePaused = true;
var highScore = 0;
var speed = 200;
var level = 'normal';

var resouceQueue = [];

var headImage = loadImage('images/cathead.png');
var bodyImage = loadImage('images/catbody.png');
var tailImages = [
    loadImage('images/catass.png'),
    loadImage('images/catassup.png'),
    loadImage('images/catassdown.png')
];
var bodyTurnUpRightImage = loadImage('images/bodyturnupright1.png');

var tailAnim = {
    frame: 0,
    frames: [0, 1, 0, 2],
    time: 0,
    frameTime: 500
}

var foodTypes = [
{
    img: loadImage('images/catnip.png'),
    sound: loadSound('sounds/catnip.mp3'),
    anim: makeFoodAnim()
},
{
    img: loadImage('images/morot.png'),
    sound: loadSound('sounds/morot.mp3'),
    anim: makeFoodAnim()
},
{
    img: loadImage('images/spider.png'),
    sound: loadSound('sounds/spider.mp3'),
    anim: makeFoodAnim()
}];

var soundStartGame = loadSound('sounds/tomcat.mp3');
var soundDeath = loadSound('sounds/death.mp3');

redrawHud();

function makeCat() {
    var parts = [{
            c: Math.floor(dim.cols / 2),
            r: dim.rows - 4,
            d: 'right'
        }];

    parts.push(makePart(parts, -1));
    parts.push(makePart(parts, -1));
    parts.push(makePart(parts, -1));

    return parts;
}

function calculateDimensions(maxNrOfTiles) {
    var viewWidth = window.innerWidth;
    var viewHeight = window.innerHeight;
    var tileSize = Math.ceil(Math.max(viewWidth, viewHeight) / maxNrOfTiles);
    var cols = viewWidth >= viewHeight ? maxNrOfTiles : Math.ceil(viewWidth / tileSize);
    var rows = viewWidth < viewHeight ? maxNrOfTiles : Math.ceil(viewHeight / tileSize);

    return {
        viewWidth: viewWidth,
        viewHeight: viewHeight,
        cols: cols,
        rows: rows,
        tileSize: tileSize,
        halfTileSize: Math.ceil(tileSize / 2)
    }
}

function getCanvas() {
    return [
        enableHdpiCanvas(document.getElementById('layer0')),
        enableHdpiCanvas(document.getElementById('layer1'))
    ];
}

function getContexts() {
    return [
        enableHdpiContext(canvas[0].getContext('2d')),
        enableHdpiContext(canvas[1].getContext('2d'))
    ];
}

function getAudioContext() {
    var c = window.AudioContext || window.webkitAudioContext;
    return new c();
}

function enableHdpiCanvas(canvas) {
    canvas.style.width = dim.viewWidth + 'px';
    canvas.style.height = dim.viewHeight + 'px';

    canvas.width = dim.viewWidth * window.devicePixelRatio;
    canvas.height = dim.viewHeight * window.devicePixelRatio;

    return canvas;
}

function enableHdpiContext(context) {
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    return context;
}

function queueResource(desc, load) {
    resouceQueue.push({
        desc: desc,
        load: load,
        loaded: false
    });
}

function loadImage(url) {
    var img = new Image();
    
    var startLoad = function (cbOnLoaded) {
        img.onload = function () {
            cbOnLoaded();
        }

        img.onerror = function () {
            cbOnLoaded({ desc: url });
        }

        img.src = url;
    }

    queueResource(url, startLoad);

    return img;
}

function loadSound(url, buffContainer) {
    var buffContainer = {};

    var startLoad = function (cbOnLoaded) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
    
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function(buffer) {
                buffContainer.buffer = buffer;
                cbOnLoaded();
            }, function () {
                cbOnLoaded({ desc: 'Could not load ' + url });
            });
        }
        request.send();
    }

    queueResource(url, startLoad);

    return buffContainer;
}

function errorLoadingSound(err) {
    console.warn(err);
}

function createSoundSource() {
    var source = audioContext.createBufferSource(); // creates a sound source
    source.connect(audioContext.destination);  // connect the source to the context's destination (the speakers)
    return source;
}

function playSound(sound) {
    var source = audioContext.createBufferSource(); // creates a sound source
    source.buffer = sound.buffer;                    // tell the source which sound to play
    source.connect(audioContext.destination);  // connect the source to the context's destination (the speakers)
    source.start(0);
}

function startGame(atlevel) {
    hideScene('startScene');

    level = atlevel || document.querySelector('input[name="difficulty"]:checked').value;
    parts = makeCat();
    fruits = [];
    highScore = 0;
    nextDirs = [];
    head.nextDir = 0;
    head.dir = 'right';

    if (level === 'easy') speed = 300;
    if (level === 'normal') speed = 120;
    if (level === 'hard') speed = 80;
    if (level === 'insane') speed = 30;

    placeFruit();

    redrawScene();

    playSound(soundStartGame);

    gameStarted = true;
    gamePaused = false;
}

function restartGame() {
    hideScene('gameOverScene');

    startGame(level);
}

function exitGame() {
    hideScene('gameOverScene');
    hideScene('pauseScene');
    showScene('startScene');
}

function pauseGame() {
    showScene('pauseScene');

    gamePaused = true;
}

function resumeGame() {
    hideScene('pauseScene');

    gamePaused = false;
}

function makePart(parts, dc, dr) {
    var c = parts[parts.length - 1].c + (dc ? dc : 0);
    var r = parts[parts.length - 1].r + (dr ? dr : 0);
    return {
        c: c,
        r: r,
        d: parts[parts.length - 1].d
    };
}

function makeFruit() {
    return {
        c: Math.floor(Math.random() * (dim.cols - 4)) + 2,
        r: Math.floor(Math.random() * (dim.rows - 4)) + 2,
        t: Math.floor(Math.random() * foodTypes.length)
    };
}

function makeFoodAnim() {
    return {
        ang: 0,
        scale: 1,
        time: 0,
        frameTime: 2000,
        timeStep: 0,
        minTimeStep: 250
    };
}

function windowResized(e) { 
    gamePaused = true;

    dim = calculateDimensions(20);

    enableHdpiCanvas(canvas[0]);
    enableHdpiCanvas(canvas[1]);

    getContexts(); // Reset scaling

    redrawHud();
    redrawScore();
}

function keyDown(e) {

    if (gameStarted) {
        if (!gamePaused) {
            if (e.keyCode === 37) { // Left        
                queueCatDirection('left');
                // gamePaused = false;
            }
            if (e.keyCode === 38) { // Up
                queueCatDirection('up');
                // gamePaused = false;
            }
            if (e.keyCode === 39) { // Right        
                queueCatDirection('right');
                // gamePaused = false;
            }
            if (e.keyCode === 40) { // Down
                queueCatDirection('down');
                // gamePaused = false;
            }
        }

        if (e.keyCode === 27) { // Esc
            if (gamePaused) {
                resumeGame();
            }
            else {
                pauseGame();
            }
        }

        if (e.keyCode === 32) {
            placeFruit();
        }
    }
}

function mouseDown(e) {
    turnCatByClickOnPageXY(e.pageX, e.pageY);
}

function touchStart(e) {
    e.preventDefault();

    if (!gamePaused && e.touches.length >= 2) {
        pauseGame();
        return;
    }
    else if (gamePaused) {
        gamePaused = false;
    }

    turnCatByClickOnPageXY(e.touches[0].pageX, e.touches[0].pageY);
}

function turnCatByClickOnPageXY(pageX, pageY) {
    var dx = pageX - (parts[0].c * dim.tileSize + dim.tileSize / 2);
    var dy = pageY - (parts[0].r * dim.tileSize + dim.tileSize / 2) - 32; // 32 height of header
    var isMoreDx = Math.abs(dx) >= Math.abs(dy);

    // console.log('dx', dx, 'dy', dy, 'isMoreDx', isMoreDx);

    if (head.dir === 'none') {
        if (isMoreDx) {
            if (dx < 0) queueCatDirection('left');
            else queueCatDirection('right');
        }
        else {
            if (dy < 0) queueCatDirection('up');
            else queueCatDirection('down');
        }
    }
    else if (head.dir === 'left' || head.dir === 'right') {
        if (dy < 0) queueCatDirection('up');
        else queueCatDirection('down');
    }
    else if (head.dir === 'up' || head.dir === 'down') {
        if (dx < 0) queueCatDirection('left');
        else queueCatDirection('right');
    }  
}


function queueCatDirection(dir) {
    if (nextDirs[nextDirs.length - 1] !== dir) {
        //console.log('Queuing', dir);
        nextDirs[nextDirs.length] = dir;
    }
}

function moveCat() {
    tryTurnHead();
    moveBody(); // Order important?
    moveHead();
}

function dequeueDir() {
    head.nextDir = Math.min(head.nextDir + 1, nextDirs.length);
}

function tryTurnHead() {
    var wantedDir = nextDirs[head.nextDir] || head.dir;

    if (wantedDir === head.dir) {
        dequeueDir();
        return;
    }

    if (wantedDir !== head.dir) {
        if (head.dir === 'left' && wantedDir === 'right') {dequeueDir(); return };
        if (head.dir === 'right' && wantedDir === 'left') {dequeueDir(); return };
        if (head.dir === 'up' && wantedDir === 'down') {dequeueDir(); return };
        if (head.dir === 'down' && wantedDir === 'up') {dequeueDir(); return };

        head.dir = wantedDir;
        dequeueDir();

        // console.log('Took turn', wantedDir);
    }
}

function moveHead() {
    var dc = 0;
    var dr = 0;

    if (head.dir === 'left') {
        dc = -1;
        dr = 0;
    }
    else if (head.dir === 'up') {
        dc = 0;
        dr = -1;
    }
    else if (head.dir === 'right') {
        dc = 1;
        dr = 0;   
    }
    else if (head.dir === 'down') {
        dc = 0;
        dr = 1;
    }

    parts[0].c += dc;
    parts[0].r += dr;
    parts[0].d = head.dir;

    if (parts[0].c < 0) parts[0].c = dim.cols - 1;
    else if (parts[0].c >= dim.cols) parts[0].c = 0;

    if (parts[0].r < 0) parts[0].r = dim.rows - 1;
    else if (parts[0].r >= dim.rows) parts[0].r = 0;
}

function moveBody() {
    for (var i = parts.length - 1; i >= 1; --i) {
        parts[i].c = parts[i - 1].c;
        parts[i].r = parts[i - 1].r;
        parts[i].d = parts[i - 1].d;
    }
}

function growCat() {
    parts.push(makePart(parts));
}

function increaseScore() {
    highScore += 10;
}

function changeSpeed() {
}

function eatFruit(f) {
    f.eaten = true;

    growCat();
    placeFruit();
    increaseScore();
    changeSpeed();
    redrawScore();
    playSound(foodTypes[f.t].sound);
}

function checkCatHasEatenFruit() {

    for (var i = 0; i < fruits.length; ++i) {
        if (fruits[i].eaten !== true && fruits[i].c === parts[0].c && fruits[i].r === parts[0].r) {            
            eatFruit(fruits[i]);
        }
    }

}

function hasCatRunIntoItself() {
    var head = parts[0];

    for (var i = 1; i < parts.length - 2; ++i) {
        if (parts[i].c === head.c && parts[i].r === head.r) return true;
    }

    return false;
}

function catDied() {

    gamePaused = true;
    gameStarted = false;

    showScene('gameOverScene');

    playSound(soundDeath);
}

var catTime = 0;

function update(dt) {
    updateCat(dt);
    updateAnimations(dt);
}

function updateCat(dt) {
    if (!gamePaused) {
        catTime += dt;

        if (catTime >= speed) {
            catTime = 0;

            checkCatHasEatenFruit();            
            moveCat();

            if (hasCatRunIntoItself()) {
                catDied();
            }
        }
    }
}

function updateAnimations(dt) {

    tailAnim.time += dt;

    if (tailAnim.time >= tailAnim.frameTime) {
        tailAnim.time = 0;
        tailAnim.frame = (tailAnim.frame + 1) % tailAnim.frames.length; 
    }

    for (var i = 0; i < foodTypes.length; ++i) {
        var anim = foodTypes[i].anim;

        anim.time += dt;

        if (anim.time >= anim.frameTime) {
            anim.time = 0;
        }

        anim.timeStep += dt;

        if (anim.timeStep >= anim.minTimeStep) {
            anim.timeStep = 0;

            anim.ang = anim.time / anim.frameTime * 360;


            anim.scale = 1 + (anim.time / anim.frameTime) * 0.2;
        }
    }

}

function placeFruit() {
    var f = makeFruit();
    fruits.push(f);
}

function rotateWhenTurn(d1, d2) {
    if (d1 === 'up' && d2 === 'right') {
        return 90; 
    }
    if (d1 === 'right' && d2 === 'up') {
        return -90; 
    }
    if (d1 === 'down' && d2 === 'right') {
        return 0; 
    }
    if (d1 === 'down' && d2 === 'left') {
        return -90; 
    }
    if (d1 === 'left' && d2 === 'down') {
        return 90; 
    }
    if (d1 === 'up' && d2 === 'left') {
        return 180; 
    }
    if (d1 === 'right' && d2 === 'down') {
        return -180; 
    }
}

function drawFruit(f) {
    context[0].save();

    context[0].translate(f.c * dim.tileSize + dim.halfTileSize, f.r * dim.tileSize + dim.halfTileSize);
    context[0].rotate(foodTypes[f.t].anim.ang * Math.PI/180);
    context[0].scale(foodTypes[f.t].anim.scale, foodTypes[f.t].anim.scale);
    context[0].drawImage(foodTypes[f.t].img, -dim.halfTileSize, -dim.halfTileSize, dim.tileSize, dim.tileSize);

    context[0].restore();
}

function drawPart(ctx, part, d, img) {
    ctx.save();

    context[0].translate(part.c * dim.tileSize + dim.halfTileSize, part.r * dim.tileSize + dim.halfTileSize);

    if (d === 'down') context[0].rotate(90*Math.PI/180);
    else if (d === 'up') context[0].rotate(-90*Math.PI/180);
    else if (d === 'right') context[0].rotate(0*Math.PI/180);
    else if (d === 'left') context[0].rotate(180*Math.PI/180);
    
    if (img) context[0].drawImage(img, -dim.halfTileSize, -dim.halfTileSize, dim.tileSize, dim.tileSize);

    ctx.restore();
}

function drawTurn(ctx, part, partAhead, img) {
    ctx.save();

    context[0].translate(part.c * dim.tileSize + dim.halfTileSize, part.r * dim.tileSize + dim.halfTileSize);

    var ang = rotateWhenTurn(partAhead.d, part.d);

    context[0].rotate(ang*Math.PI/180);

    context[0].drawImage(img, -dim.halfTileSize, -dim.halfTileSize, dim.tileSize, dim.tileSize);

    ctx.restore();
}

function redrawFruits() {
    for (var i = 0; i < fruits.length; ++i) {
        if (!fruits[i].eaten) drawFruit(fruits[i]);
    }
} 

function redrawCat() { 
    drawPart(context[0], parts[parts.length - 2], parts[parts.length - 3].d, tailImages[tailAnim.frames[tailAnim.frame]]);

    for (var i = parts.length - 3; i >= 1; --i) {
        if (parts[i - 1].d !== parts[i].d) {        
            drawTurn(context[0], parts[i], parts[i - 1], bodyTurnUpRightImage)
        }
        else {        
            drawPart(context[0], parts[i], parts[i].d, bodyImage);
        }
    }

    drawPart(context[0], parts[0], parts[0].d, headImage);
}

function redrawHud() {
}

function redrawScore() {
    context[1].textBaseline = 'top';
    context[1].textAlign = 'end';
    context[1].font = 'bold ' + (dim.tileSize * 2) + 'px Helvetica';
    context[1].fillStyle = '#111';

    context[1].clearRect(0, 0, dim.viewWidth, (dim.tileSize * 2));
    context[1].fillText(highScore + '', dim.viewWidth - 4, 0);
}

function drawScene() {
    context[0].clearRect(0, 0, dim.viewWidth, dim.viewHeight);

    for (var i = 0; i < fruits.length; ++i) {
        if (!fruits[i].eaten) drawFruit(fruits[i]);
    }

    redrawFruits();
    redrawCat();
}

function redrawScene() {
    redrawHud();
    redrawScore();
    drawScene();   
}

var lastTime = 0;

function gameLoop() {
    var dt = Date.now() - lastTime;

    update(dt);    
    drawScene();
    
    //window.setTimeout(function () {
        window.requestAnimationFrame(gameLoop)
    //}, Math.floor(speed/2));

    lastTime = Date.now();
}

function startLoadResource(r, cbOnLoaded) {
    console.info('Loading resource', r.desc);

    r.load(function (err) {
        r.loaded = true;
        cbOnLoaded(err);
    });
}

function isAllResourcesLoaded() {
    for (var i = 0; i < resouceQueue.length; ++i) {
        if (resouceQueue[i].loaded === false) return false;
    }
    return true;
}

function waitUntilAllResoucesLoaded(cbOnAllResourcesLoaded, cbOnError) {
    var hasError = false;

    for (var i = 0; i < resouceQueue.length; ++i) {
        startLoadResource(resouceQueue[i], function (err) {
            if (err) {
                hasError = true;
                console.warn('Could not load', err.desc);
            }

            if (isAllResourcesLoaded()) {
                console.info('All resources loaded');
                
                if (hasError) cbOnError();
                else cbOnAllResourcesLoaded();
            }
        });
    }
}

function hideScene(id) {
    document.getElementById(id).className = 'scene hidden';
}

function showScene(id) {
    document.getElementById(id).className = 'scene';   
}

waitUntilAllResoucesLoaded(function () {
    console.log('Starting game');
    
    hideScene('loadingScene');
    showScene('startScene');
        
    gameLoop();
},
function onError() {
    console.log('Could not start game');

    hideScene('loadingScene');
    showScene('errorScene');
});
