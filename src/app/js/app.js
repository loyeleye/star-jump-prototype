PIXI.utils.sayHello();

let renderer = PIXI.autoDetectRenderer({height: 512, width: 512, transparent: true, resolution: 1});
document.getElementById('display').appendChild(renderer.view);

let t = new Tink(PIXI, renderer.view);
let stage = new PIXI.Container();
let debug = true;

PIXI.loader.add("spritesheet", "../img/spritesheet_caveman.png")
    .add("../img/hextile.png").load(setup);

let sprite;
let tile;
let tilemap = {};
let coordsText;
let coords;
let pointer = t.makePointer();

function setup() {
    stage.position.x = renderer.width/2;
    stage.position.y = renderer.height/2;
    let rect = new PIXI.Rectangle(0,0,32,32);
    let texture1 = PIXI.loader.resources["spritesheet"].texture;
    texture1.frame = rect;

    sprite = new PIXI.Sprite(texture1);
    let idle = setInterval(function() {
        rect.x += 32;
        if (rect.x >= 32 * 4) rect.x = 0;
        sprite.texture.frame = rect;
    }, 500);
    //sprite.scale.set(2, 2);
    //sprite.vx = 3;

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


            coords = `${x},${y*2}`;
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

            coords = `${x},${y*2+1}`;
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

    tile = tilemap["6,8"];

    stage.addChild(sprite);
    sprite.position.copyFrom(tile.position);
    sprite.position.x -= tile.width / 4;
    sprite.position.y -= tile.height / 3;

    //tile.addChild(sprite);
    //sprite.anchor.set(0.5,0.5);

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

    stage.pivot.copy(sprite.position);
    renderer.render(stage);
}

window.addEventListener("keydown", function(event) {
    event.preventDefault();
    sprite.x += sprite.vx;
});