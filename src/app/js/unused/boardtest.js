PIXI.utils.sayHello();

let renderer = PIXI.autoDetectRenderer({height: 512, width: 512, transparent: true, resolution: 1});
document.getElementById('display').appendChild(renderer.view);

let t = new Tink(PIXI, renderer.view);
let stage = new PIXI.Container();
let debug = true;

PIXI.loader.add("../img/hextile.png").load(setup);

let tile;
let tilemap = {};
let coordsText;
let coords;
let pointer = t.makePointer();

function setup() {

    for (let y = 0; y <= 10; y++) {
        for (let x = 0; x <= 5; x++) {
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
    for (let y = 0; y <= 10; y++) {
        for (let x = 0; x <= 5; x++) {
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

    renderer.render(stage);
}