PIXI.utils.sayHello();

let renderer = PIXI.autoDetectRenderer({height: 512, width: 512, transparent: true, resolution: 1});
document.getElementById('display').appendChild(renderer.view);

let stage = new PIXI.Container();

PIXI.loader.add("../img/hextile.png").load(setup);

let tile;

function setup() {
    tile = new PIXI.Sprite(
        PIXI.loader.resources["../img/hextile.png"].texture
    );

    stage.addChild(tile);
    tile.anchor.set(0.5, 0.5);
    tile.scale.set(0.4, 0.4);
    tile.x = renderer.width / 2;
    tile.y = renderer.height / 2;

    animationLoop();
}

function animationLoop() {
    requestAnimationFrame(animationLoop);

    tile.rotation += 0.01;

    renderer.render(stage);
}