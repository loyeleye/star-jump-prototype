PIXI.utils.sayHello();

let renderer = PIXI.autoDetectRenderer({height: 512, width: 512, transparent: true, resolution: 1});
document.getElementById('display').appendChild(renderer.view);

let t = new Tink(PIXI, renderer.view);
let stage = new PIXI.Container();
let debug = true;

PIXI.loader.add("spritesheet", "../img/spritesheet_stick.png")
    .add("../img/hextile.png").load(setup);

let playerX = 6;
let playerY = 8;

let sprite;
let startTile;
let destTile;

let isMoving = false;
const tick = 500; // Number of milliseconds per action
let startActionTime;
let endActionTime;

let posXFrom = 0;
let posXTo = 0;
let posYFrom = 0;
let posYTo = 0;

let tile;
let tilemap = {};
let coordsText;
let coords;
let pointer = t.makePointer();

function setup() {
    stage.position.x = renderer.width/2;
    stage.position.y = renderer.height/2;
    let rect = new PIXI.Rectangle(0,128,32,64);
    let texture1 = PIXI.loader.resources["spritesheet"].texture;
    texture1.frame = rect;

    sprite = new PIXI.Sprite(texture1);
    let idle = setInterval(function() {
        rect.x += 32;
        if (rect.x >= 32 * 9) rect.x = 0;
        sprite.texture.frame = rect;
    }, 500);
    //sprite.scale.set(2, 2);
    sprite.vx = 3;

    for (let y = 0; y <= 20; y++) {
        for (let x = 0; x <= 10; x++) {
            tile = new PIXI.Sprite(
                PIXI.loader.resources["../img/hextile.png"].texture
            );
            tile.anchor.set(0.5, 0.5);
            tile.scale.set(0.4, 0.4);
            stage.addChild(tile);
            tile.x = tile.width * x * 1.5;
            tile.y = tile.height * y;
            tile.circular = true;

            coords = `${x*2},${y}`;
            tilemap[coords] = tile;

            if (debug) {
                coordsText = new PIXI.Text(coords, {font: "24px Helvetica", fill: "yellow", align: "center"});
                coordsText.anchor.set(0.5,0.5);
                tile.addChild(coordsText);
                //console.log("x: ".concat(x, "tile-x: ", tile.x));
                //console.log("y: ".concat(y, "tile-y: ", tile.y));
            }
        }
    }
    for (let y = 0; y <= 20; y++) {
        for (let x = 0; x <= 10; x++) {
            tile = new PIXI.Sprite(
                PIXI.loader.resources["../img/hextile.png"].texture
            );
            tile.anchor.set(0.5, 0.5);
            tile.scale.set(0.4, 0.4);
            stage.addChild(tile);
            tile.x = tile.width * x * 1.5 + (tile.width * 0.75);
            tile.y = tile.height * y + (tile.height * 0.5);
            tile.circular = true;

            coords = `${x*2+1},${y}`;
            tilemap[coords] = tile;

            if (debug) {
                coordsText = new PIXI.Text(coords, {font: "24px Helvetica", fill: "yellow", align: "center"});
                coordsText.anchor.set(0.5,0.5);
                tile.addChild(coordsText);
                //console.log("x: ".concat(x, "tile-x: ", tile.x));
                //console.log("y: ".concat(y, "tile-y: ", tile.y));
            }
        }
    }

    stage.addChild(sprite);
    setSpritePos(playerX, playerY);

    gameLoop();
    animationLoop();
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    //state();
    t.update();
    renderer.render(stage);
}

function animationLoop() {
    requestAnimationFrame(animationLoop);

    if (pointer.hitTestSprite(tilemap["2,3"])) {
        pointer.cursor = "pointer";
    }
    else {
        pointer.cursor = "auto";
    }

    updateSpritePos();
    stage.pivot.copyFrom(sprite.position);
    renderer.render(stage);
}

function getCoords(x, y) {
    return `${x},${y}`;
}

function setSpritePos(x, y) {
    coords = getCoords(x, y);
    tile = tilemap[coords];

    setSpritePosTile(tile);
}

function setSpritePosTile(tile) {
    sprite.position.copyFrom(tile.position);
    sprite.position.x -= tile.width / 4;
    sprite.position.y -= tile.height / 3;

    startTile = tile;
    destTile = tile;
    startActionTime = Date.now();
    endActionTime = startActionTime;
    isMoving = false;
}

function movePlayer(x, y) {
    if (isMoving) return;

    coords = getCoords(x, y);
    console.log("Moving player to " + coords);
    destTile = tilemap[coords];

    startActionTime = Date.now();
    endActionTime = startActionTime + tick;

    let playerCenterOnTileOffsetX = -1 * tile.width / 4;
    let playerCenterOnTileOffsetY = -1 * tile.height / 3;

    posXFrom = startTile.position.x + playerCenterOnTileOffsetX;
    posYFrom = startTile.position.y + playerCenterOnTileOffsetY;
    posXTo = destTile.position.x + playerCenterOnTileOffsetX;
    posYTo = destTile.position.y + playerCenterOnTileOffsetY;
    isMoving = true;
}

function updateSpritePos() {
    if (!isMoving) return;
    if (endActionTime <= Date.now()) {
        setSpritePosTile(destTile);
        return;
    }

    let currentTime = Date.now() - startActionTime;
    let endTime = endActionTime - startActionTime;
    let actionPercentage = currentTime * 1.0 / endTime;

    let xTranspose = (posXTo - posXFrom) * actionPercentage;
    let yTranspose = (posYTo - posYFrom) * actionPercentage;

    sprite.position.x = posXFrom + xTranspose;
    sprite.position.y = posYFrom + yTranspose;
}

window.addEventListener("keydown", function(event) {
    event.preventDefault();
    userInputMovement(event.key);
});

function userInputMovement(key) {
    if (isMoving) return;
    console.log(key);

    let x = 0;
    let y = 0;

    switch(key){
        case 'q': //
            x = -1;
            y = -1;
            break;
        case 'a': //a
            x = -1;
            y = 1;
            break;
        case 'w': //w
            y = -2;
            break;
        case 's': //s
            y = 2;
            break;
        case 'e': //e
            x = 1;
            y = -1;
            break;
        case 'd': //d
            x = 1;
            y = 1;
            break;
    }

    if (x !== 0 && y !== 0) {
        playerX += x;
        playerY += y;
        movePlayer(playerX, playerY);
    }
}