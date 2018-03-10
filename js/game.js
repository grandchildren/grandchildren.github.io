var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

// The main game loop
var lastTime;
function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
};

function init() {
    backgroundPattern = ctx.createPattern(resources.get('images/background.png'), 'repeat');
    reset();
    lastTime = Date.now();
    main();
}

resources.load([
    'images/sprites.png',
    'images/background.png'
]);
resources.onReady(init);

// Game state
var chud = {
    pos: [0, 0],
    sprite: new Sprite('images/sprites.png', [0, 61], [44, 44], 16, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
};

var bullets = [];
var llamas = [];
var explosions = [];

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;
var backgroundPattern;

var score = 0;
var scoreEl = document.getElementById('score');

// Speed in pixels per second
var playerSpeed = 200;
var bulletSpeed = 500;
var enemySpeed = 200;

// Update game objects
function update(dt) {
    gameTime += dt;

    handleInput(dt);
    updateEntities(dt);

    // It gets harder over time by adding llamas using this
    // equation: 1-.993^gameTime
    if(Math.random() < 1 - Math.pow(.993, gameTime)) {
        llamas.push({
            pos: [canvas.width,
                  Math.random() * (canvas.height - 39)],
            sprite: new Sprite('images/sprites.png', [0, 226], [50, 60],
                               5, [0, 1, 2, 3, 2, 1])
        });
    }

    checkCollisions();
};

function handleInput(dt) {
    if(input.isDown('DOWN') || input.isDown('s')) {
        chud.pos[1] += playerSpeed * dt;
    }

    if(input.isDown('UP') || input.isDown('w')) {
        chud.pos[1] -= playerSpeed * dt;
    }

    if(input.isDown('LEFT') || input.isDown('a')) {
        chud.pos[0] -= playerSpeed * dt;
    }

    if(input.isDown('RIGHT') || input.isDown('d')) {
        chud.pos[0] += playerSpeed * dt;
    }

    if(input.isDown('SPACE') &&
       !isGameOver &&
       Date.now() - lastFire > 100) {
        var x = chud.pos[0] + chud.sprite.size[0] / 2;
        var y = chud.pos[1] + chud.sprite.size[1] / 2;

        bullets.push({ pos: [x, y],
                       dir: 'forward',
		sprite: new Sprite('images/sprites.png', [0, 0], [50, 50], 1, [0]) });
                       
        bullets.push({ pos: [x, y],
                       dir: 'up',
		sprite: new Sprite('images/sprites.png', [0, 164], [54, 66], 16, [0, 1, 2, 3, 4, 5, 6]) });
                       
        bullets.push({ pos: [x, y],
                       dir: 'down',
		sprite: new Sprite('images/sprites.png', [0, 164], [54, 66], 16, [0, 1, 2, 3, 4, 5, 6]) });
                       

        lastFire = Date.now();
    }
}

function updateEntities(dt) {
    // Update the chud sprite animation
    chud.sprite.update(dt);

    // Update all the bullets
    for(var i=0; i<bullets.length; i++) {
        var bullet = bullets[i];

        switch(bullet.dir) {
        case 'up': bullet.pos[1] -= bulletSpeed * dt; break;
        case 'down': bullet.pos[1] += bulletSpeed * dt; break;
        default:
            bullet.pos[0] += bulletSpeed * dt;
        }

        // Remove the bullet if it goes offscreen
        if(bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
           bullet.pos[0] > canvas.width) {
            bullets.splice(i, 1);
            i--;
        }
    }

    // Update all the llamas
    for(var i=0; i<llamas.length; i++) {
        llamas[i].pos[0] -= enemySpeed * dt;
        llamas[i].sprite.update(dt);

        // Remove if offscreen
        if(llamas[i].pos[0] + llamas[i].sprite.size[0] < 0) {
            llamas.splice(i, 1);
            i--;
        }
    }

    // Update all the explosions
    for(var i=0; i<explosions.length; i++) {
        explosions[i].sprite.update(dt);

        // Remove if animation is done
        if(explosions[i].sprite.done) {
            explosions.splice(i, 1);
            i--;
        }
    }
}

// Collisions

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}

function checkCollisions() {
    checkPlayerBounds();
    
    // Run collision detection for all llamas and bullets
    for(var i=0; i<llamas.length; i++) {
        var pos = llamas[i].pos;
        var size = llamas[i].sprite.size;

        for(var j=0; j<bullets.length; j++) {
            var pos2 = bullets[j].pos;
            var size2 = bullets[j].sprite.size;

            if(boxCollides(pos, size, pos2, size2)) {
                // Remove the enemy
                llamas.splice(i, 1);
                i--;

                // Add score
                score += 100;

                // Add an explosion
                explosions.push({
                    pos: pos,
                    sprite: new Sprite('images/sprites.png',
                                       [12, 118],
                                       [39, 39],
                                       16,
                                       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                       null,
                                       true)
                });

                // Remove the bullet and stop this iteration
                bullets.splice(j, 1);
                break;
            }
        }

        if(boxCollides(pos, size, chud.pos, chud.sprite.size)) {
            gameOver();
        }
    }
}

function checkPlayerBounds() {
    // Check bounds
    if(chud.pos[0] < 0) {
        chud.pos[0] = 0;
    }
    else if(chud.pos[0] > canvas.width - chud.sprite.size[0]) {
        chud.pos[0] = canvas.width - chud.sprite.size[0];
    }

    if(chud.pos[1] < 0) {
        chud.pos[1] = 0;
    }
    else if(chud.pos[1] > canvas.height - chud.sprite.size[1]) {
        chud.pos[1] = canvas.height - chud.sprite.size[1];
    }
}

// Draw everything
function render() {
    ctx.fillStyle = backgroundPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render the chud if the game isn't over
    if(!isGameOver) {
        renderEntity(chud);
    }

    renderEntities(bullets);
    renderEntities(llamas);
    renderEntities(explosions);
	
	ctx.text = ("Score is : " + score);
};

function renderEntities(list) {
    for(var i=0; i<list.length; i++) {
        renderEntity(list[i]);
    }    
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

// Game over
function gameOver() {
    isGameOver = true;
	reset();
}

// Reset game to original state
function reset() {
    isGameOver = false;
    gameTime = 0;
    score = 0;

    llamas = [];
    bullets = [];

    chud.pos = [50, canvas.height / 2];
};