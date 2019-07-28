PIXI.utils.sayHello();

let renderer = PIXI.autoDetectRenderer({
                                            width: 512,
                                            height: 512,
                                            transparent: true,
                                            resolution: 1
                                        });

document.getElementById('display').appendChild(renderer.view);

let stage = new PIXI.Container();

PIXI.loader
    .add("spritesheet", "../img/spritesheet_caveman.png")
    .load(setup);

let sprite;

function setup() {
    stage.interactive = true;

    let rect = new PIXI.Rectangle(0,0,32,32);
    let texture = PIXI.loader.resources["spritesheet"].texture;
    texture.frame = rect;

    sprite = new PIXI.Sprite(texture);

    let idle = setInterval(function() {
        rect.x += 32;
        if (rect.x >= 32 * 4) rect.x = 0;
        sprite.texture.frame = rect;
    }, 500);

    sprite.scale.set(2, 2);
    sprite.vx = 3;
    stage.addChild(sprite);

    animationLoop();
}

function animationLoop() {
    requestAnimationFrame(animationLoop);

    renderer.render(stage);
}

window.addEventListener("keydown", function(event) {
    event.preventDefault();
    sprite.x += sprite.vx;
});