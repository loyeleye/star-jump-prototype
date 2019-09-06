/***
 * Game Parameters
 */
const SCREEN_HEIGHT = 960;
const SCREEN_WIDTH = 640;
const BOARD_SIZE = 15;
const GAME_TICK = 500;
const PLAYER_START_POS = [2,-1,-1];
let DEBUG = false;
let MOUSE_MOVEMENT = true;

const GAME_LENGTH = 90;
let TimerInterval;
const TimeSound = new Howl({
    src: ['../audio/steamwhistle_0.wav']
});
const scoreSound = new Howl({
    src: ['../audio/shimmer_1.flac']
});

const ScoreText = document.getElementById("scoreText");
const NameInputBox = document.getElementById("playerName");
let PLAYER_NAME = `Player ${Math.floor(Math.random() * 99) + 1}`;

let stage = new PIXI.Container();

let player;
let ship;
let board;
let orbs = {};
let score = 0;
let highScore = 0;
let clickDelay = 0.0;

let renderer = PIXI.autoDetectRenderer({height: SCREEN_HEIGHT, width: SCREEN_WIDTH, transparent: true, resolution: 1});
document.getElementById('display').appendChild(renderer.view);
let t = new Tink(PIXI, renderer.view);
let pointer = t.makePointer();

PIXI.loader
    .add("player-move", "../img/spritesheet_drifter.png")
    .add("player-pull", "../img/spritesheet_drifter_pull.png")
    .add("player", "../img/spritesheet_drifter_ready.png")
    .add("ship", "../img/spacestation.png")
    .add("orb", "../img/glow_balls.png")
    .add("../img/hextile.png").load(setup);

// Point class logic came from RedBlobGames.com
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

/**
 * Hex class logic came from RedBlobGames.com
 */
class Hex {
    constructor(q, r, s) {
        this.q = q;
        this.r = r;
        this.s = s;
        if (Math.round(q + r + s) !== 0)
            throw "q + r + s must be 0";
        this.coords = [q,r,s];
    }
    equals(b) {
        return this.q === b.q && this.r === b.r && this.s === b.s;
    }
    add(b) {
        return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
    }
    subtract(b) {
        return new Hex(this.q - b.q, this.r - b.r, this.s - b.s);
    }
    scale(k) {
        return new Hex(this.q * k, this.r * k, this.s * k);
    }
    rotateLeft() {
        return new Hex(-this.s, -this.q, -this.r);
    }
    rotateRight() {
        return new Hex(-this.r, -this.s, -this.q);
    }
    static direction(direction) {
        return Hex.directions[direction];
    }
    neighbor(direction) {
        return this.add(Hex.direction(direction));
    }
    diagonalNeighbor(direction) {
        direction = 'de' ? 'ed' :
                    'sd' ? 'ds' :
                    'as' ? 'sa' :
                    'qa' ? 'aq' :
                    'wq' ? 'qw' :
                    'ew' ? 'we' : direction;
        return this.add(Hex.diagonals[direction]);
    }
    len() {
        return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
    }
    distance(b) {
        return this.subtract(b).len();
    }
    round() {
        let qi = Math.round(this.q);
        let ri = Math.round(this.r);
        let si = Math.round(this.s);
        let q_diff = Math.abs(qi - this.q);
        let r_diff = Math.abs(ri - this.r);
        let s_diff = Math.abs(si - this.s);
        if (q_diff > r_diff && q_diff > s_diff) {
            qi = -ri - si;
        }
        else if (r_diff > s_diff) {
            ri = -qi - si;
        }
        else {
            si = -qi - ri;
        }
        return new Hex(qi, ri, si);
    }
    lerp(b, t) {
        return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
    }
    linedraw(b) {
        let N = this.distance(b);
        let a_nudge = new Hex(this.q + 0.000001, this.r + 0.000001, this.s - 0.000002);
        let b_nudge = new Hex(b.q + 0.000001, b.r + 0.000001, b.s - 0.000002);
        let results = [];
        let step = 1.0 / Math.max(N, 1);
        for (let i = 0; i <= N; i++) {
            results.push(a_nudge.lerp(b_nudge, step * i).round());
        }
        return results;
    }
    asDir() {
        return Hex.directionsInverted[`${this.q},${this.r},${this.s}`]
    }
}
Hex.directions = {
    'e': new Hex(1, 0, -1),
    'd': new Hex(1, -1, 0),
    's': new Hex(0, -1, 1),
    'a': new Hex(-1, 0, 1),
    'q': new Hex(-1, 1, 0),
    'w': new Hex(0, 1, -1)
};
Hex.directionsInverted = {};
for (let key in Hex.directions) {
    let hex = Hex.directions[key];
    Hex.directionsInverted[`${hex.q},${hex.r},${hex.s}`] = key;
}
Hex.diagonals = {
    'ed': new Hex(2, -1, -1),
    'ds': new Hex(1, -2, 1),
    'sa': new Hex(-1, -1, 2),
    'aq': new Hex(-2, 1, 1),
    'qw': new Hex(-1, 2, -1),
    'we': new Hex(1, 1, -2)
};

class Tile extends Hex {
    constructor(x = 0,y = 0,z = 0) {
        super(x,y,z);
        this.x = x;
        this.y = y;
        this.z = z;
        this.neighbors = {};
        this._graphic = new PIXI.Sprite(
            PIXI.loader.resources["../img/hextile.png"].texture
        );
        this._passable = true;
        this.pathTraversalTime = 1;
        this.draw(stage);
    }
    hasNeighbor(tile) {
        return Object.values(this.neighbors).some((neighborTile) => neighborTile.equals(tile));
    }
    addNeighbor(direction, tile) {
        this.neighbors[direction] = tile;
    }
    getCoords() {
        return `${this.coords[0]},${this.coords[1]},${this.coords[2]}`;
    }
    getPixelCoords() {
        return new Point(this._graphic.x, this._graphic.y);
    }
    draw(stage) {
        let dx = 0, dy = 0;
        dx += (this.x * 0.75);
        dy += (this.x * 0.5 + this.z);
        this._graphic.anchor.set(0.5, 0.5);
        this._graphic.scale.set(0.4, 0.4);
        stage.addChild(this._graphic);
        this._graphic.x = dx * this._graphic.width;
        this._graphic.y = dy * this._graphic.height;
        this._graphic.circular = true;
        if (DEBUG) {
            let coordsText = new PIXI.Text(this.getCoords(), {font: "24px Helvetica", fill: "yellow", align: "center"});
            coordsText.anchor.set(0.5,0.5);
            this._graphic.addChild(coordsText);
        }
    }
    getNeighbor(direction) {
        return this.neighbors[direction];
    }
    toHex() {
        return new Hex(this.x,this.y,this.z);
    }
    linedraw(b) {
        const hexPath = super.linedraw(b);
        let dirPath = [];
        for (let from = 0, to = 1; to < hexPath.length; from++, to++) {
            const dir = hexPath[to].subtract(hexPath[from]).asDir();
            dirPath.push(dir);
        }
        return dirPath;
    }
}

class Board {
    getTile(x, y, z) {
        return this._tilemap[`${x},${y},${z}`];
    }

    findTileByPos(pixelX, pixelY) {
        pixelX -= stage.position.x - player._location._graphic.position.x;
        pixelY -= stage.position.y - player._location._graphic.position.y;
        const tile = this.getTile(0,0,0);
        const tileWidth = tile._graphic.width;
        const tileHeight = tile._graphic.height;

        const dx = pixelX / tileWidth;
        const dy = pixelY / tileHeight;

        // Converting to cube coordinates
        const cubeX = Math.round(dx / 0.75);
        const cubeZ = Math.round(dy - (cubeX * 0.5));
        const cubeY = -(cubeX + cubeZ);

        return this.getTile(cubeX, cubeY, cubeZ);
    }

    constructor(testContainsTile) {
        this._test = testContainsTile;
        this._tilemap = {};

        let tile = new Tile(0,0,0);
        this._tilemap[tile.getCoords()] = tile;
        this._keys = [tile.getCoords()];

        for (let i = 0; i < this._keys.length; i++) {
            tile = this._tilemap[this._keys[i]];
            for (let dir in Hex.directions) {
                const nHex = tile.neighbor(dir);
                const hexCoords = `${nHex.q},${nHex.r},${nHex.s}`;
                if (this._test(nHex, BOARD_SIZE)) {
                   if (hexCoords in this._tilemap) {
                       if (!tile.hasNeighbor(this._tilemap[hexCoords]))
                           tile.addNeighbor(dir, this._tilemap[hexCoords]);
                   }
                   else {
                       const nTile = new Tile(nHex.q, nHex.r, nHex.s);
                       tile.addNeighbor(dir, nTile);
                       this._tilemap[hexCoords] = nTile;
                       this._keys.push(hexCoords);
                   }
               }
            }
        }
    }
}

class Ship {
    constructor(tile) {
        this._graphic = new PIXI.Sprite(PIXI.loader.resources["ship"].texture);
        this._offsetX = 0;
        this._offsetY = 0;
        this._shipRadius = 1;
        this._tiles = [];
        this._graphic.anchor.set(0.5, 0.5);
        this._graphic.scale.set(0.3, 0.3);
        this._graphic.position.copyFrom(tile._graphic.position);
        this._center = tile;
        stage.addChild(this._graphic);

        this.storeTilesUnderShip(this._center, this._shipRadius);

        for (let t in this._tiles)
            this._tiles[t]._passable = false;
    }

    // calcShipTileSize() {
    //     let size = 1;
    //     for (let r = 1; r <= this._shipRadius; r++) size += r * 6;
    //     return size;
    // }

    storeTilesUnderShip() {
        const size = 1 + 3 * (this._shipRadius**2 + this._shipRadius); // See calcShipTileSize function
        for (let t in board._tilemap) {
            const tile = board._tilemap[t];
            if (Math.max(Math.abs(tile.x + this._center.x),
                        Math.abs(tile.y + this._center.y),
                        Math.abs(tile.z + this._center.z)) <= this._shipRadius) {
                this._tiles.push(tile);
                if (this._tiles.length === size) return;
            }
        }
    }

    isOnTile(tile) {
        return this._tiles.includes(tile);
    }
}

class Unit {
    constructor(tile, id) {
        this._lerp = new SpriteLerp();
        this._location = tile;
        this._state = Unit.Status.READY;
        this._offsetX = -tile._graphic.width/4;
        this._offsetY = -tile._graphic.height/3;
        this._texture = null;
        this._graphic = null;
        this._movePath = [];
        this.setGraphic(id);
        this.setPos(tile);
    }

    setGraphic(img) {
        throw new Error("ERROR: Please set this._graphic and this._texture in the setGraphic() method!")
    }

    cancelPull() {
        throw new Error("ERROR: Calling cancel pull from abstract class. Please instantiate it from inherited class");
    }

    turn(direction) {}

    changeState(state) {
        this._state = state;
    }

    move(direction, ticks) {
        if (this._state === Unit.Status.MOVING || this._lerp._active)
            return;
        if (this._state === Unit.Status.PULLING)
            this.cancelPull();

        let onTile = this._location;
        let neighbor = onTile.getNeighbor(direction);
        if (neighbor._passable === false) {
            return;
        }
        this.changeState(Unit.Status.MOVING);
        let from = new Point(this._graphic.x, this._graphic.y);
        let to = new Point(neighbor._graphic.x + this._offsetX,
            neighbor._graphic.y + this._offsetY);
        this.turn(direction);
        this._lerp.start(from, to, ticks);
        this._location = neighbor;
    }

    setPos(tile) {
        this._graphic.position.copyFrom(tile._graphic.position);
        this._graphic.position.x += this._offsetX;
        this._graphic.position.y += this._offsetY;
        this._location = tile;
    }

    animate() {
        if (this._lerp._active) {
            let at = this._lerp.update();
            this._graphic.position.x = at.x;
            this._graphic.position.y = at.y;
        } else {
            this.changeState(Unit.Status.READY);
        }
    }

    lerpToTile(tile) {
        if (this._lerp._active) return;

        let from = new Point(this._graphic.x, this._graphic.y);
        let to = tile.getPixelCoords();
        to.x += this._offsetX;
        to.y += this._offsetY;
        this._location = tile;
        this._lerp.start(from, to, 1);
    }
}

Unit.Status = {
    MOVING: 50,
    PULLING: 30,
    PULLED: 25,
    READY: 1
};

class Orb extends Unit {
    // 59 x 58 sprite
    constructor(tile, id) {
        super(tile, id);
        super._offsetX = -tile._graphic.width/3;
        this.setPos(tile);
        orbs[id] = this;
    }

    setGraphic(unitId) {
        this._texture = PIXI.loader.resources["orb"].texture;
        let rect = new PIXI.Rectangle(0,64,32,32);
        this._texture.frame = rect;
        this._graphic = new PIXI.Sprite(this._texture);
        this._graphic.scale.set(1.5,1.5);

        this._anim = setInterval(function() {
            rect.x += 32;
            if (rect.x >= 32 * 3) rect.x = 0;
            orbs[unitId]._graphic.texture.frame = rect;
        }, 50);

        stage.addChild(this._graphic);
    }

    pull(path) {
        this._movePath = path;
        this._state = Unit.Status.PULLED;
    }

    stopPull() {
        this._movePath = [];
        this._state = Unit.Status.READY;
    }

    cancelPull() {
        // Return only first element of array (use slice)
        this._movePath = this._movePath.slice(0,1);
    }

    hasReachedShip() {
        return ship.isOnTile(this._location);
    }

    static pathIsImpassable(tile) {
        // Check if next tile is impassable but not ship
        if (!ship.isOnTile(tile) && tile._passable === false) return true;
    }

    resetPos() {
        let x, y, loc;
        do {
            x = Math.floor(Math.random() * BOARD_SIZE) - Math.floor(BOARD_SIZE / 2);
            y = Math.floor(Math.random() * BOARD_SIZE) - Math.floor(BOARD_SIZE / 2);
            loc = board.getTile(x,y, -(x+y));
        } while (Math.abs(x) < 3 && Math.abs(y) < 3 || loc._passable === false);
        this.setPos(loc);
    }

    score() {
        scoreSound.play();
        score += 1;
        this.resetPos();
        this._state = Unit.Status.READY;
        ScoreText.innerHTML = `Score: ${score}<br>High Score: ${highScore}`;
    }

    animate() {
        if (this._lerp._active) {
            let at = this._lerp.update();
            this._graphic.position.x = at.x;
            this._graphic.position.y = at.y;
        } else if (this._state === Unit.Status.PULLED) {
            if (this.hasReachedShip()) {
                this.score();
            }
            else if (this._movePath.length > 0) {
                const nextDir = this._movePath.shift();
                const nextTile = this._location.getNeighbor(nextDir);

                if (Orb.pathIsImpassable(nextTile)) this.stopPull();

                this.lerpToTile(nextTile);
            } else {
                this._state = Unit.Status.READY;
            }
        }
    }
}

class Player extends Unit {
    constructor(tile) {
        super(tile, null);
        this._isPulling = false;
    }

    moveTo(tile) {
        if (this._state === Unit.Status.PULLING)
            this.cancelPull();

        this._movePath = FindTilePath(this._location, tile);
        this.changeState(Unit.Status.MOVING);
    }

    setGraphic(img) {
        this._texture = PIXI.loader.resources["player"].texture;
        let rect = new PIXI.Rectangle(0,96,32,32);
        this._texture.frame = rect;
        this._graphic = new PIXI.Sprite(this._texture);

        this._anim = setInterval(function() {
            rect.x += 32;
            if (rect.x >= 32 * 12) rect.x = 0;
            player._graphic.texture.frame = rect;
        }, 75);

        this.drawName();
        stage.addChild(this._graphic);
    }

    turn(direction) {
        console.log(`Player turned ${direction}`);
        switch(direction) {
            case 'q':
            case 'a':
                this._graphic.texture.frame.y = 64;
                break;
            case 'w':
                this._graphic.texture.frame.y = 0;
                break;
            case 's':
                this._graphic.texture.frame.y = 32;
                break;
            case 'e':
            case 'd':
                this._graphic.texture.frame.y = 96;
                break;
            default:
                console.error(`ERROR: Invalid turn direction was given. ${direction} is not a valid direction!`);
                break;
        }
    }

    pull(obj) {
        if (this._state === Unit.Status.MOVING) {
            this._movePath = [];
            clickDelay = Date.now() + GAME_TICK;
        }
        if (this._lerp.active)
            return;
        if (this._state === Unit.Status.PULLING)
            this.cancelPull();

        let fromTile = obj._location;
        let toTile = this._location;
        let tilePath = fromTile.linedraw(toTile);

        if (tilePath.length <= 0)
            return;

        let dir = tilePath[0];
        switch (dir) {
            case 'w':
                dir = 's'; break;
            case 's':
                dir = 'w'; break;
            case 'e':
                dir = 'a'; break;
            case 'a':
                dir = 'e'; break;
            case 'q':
                dir = 'd'; break;
            case 'd':
                dir = 'q'; break;
        }
        this.turn(dir);

        obj.pull(tilePath.slice(0,-1));
        this._isPulling = obj;
        this.changeState(Unit.Status.PULLING);
    }

    cancelPull() {
        this._isPulling.cancelPull();
        this.changeState(Unit.Status.READY);
    }

    changeState(state) {
        switch(state) {
            case Unit.Status.MOVING:
                console.log("Player is moving...");
                this._texture = PIXI.loader.resources["player-move"].texture;
                break;
            case Unit.Status.PULLING:
                console.log("Player is pulling...");
                this._texture = PIXI.loader.resources["player-pull"].texture;
                break;
            case Unit.Status.READY:
                console.log("Player is idle.");
                this._texture = PIXI.loader.resources["player"].texture;
                break;
            default:
                console.error(`ERROR: ${state.toString()} is not a valid state. Using READY state.`);
                this._texture = PIXI.loader.resources["player"].texture;
                state = Unit.Status.READY;
        }
        stage.removeChild(this._graphic);
        this._graphic = new PIXI.Sprite(this._texture);
        this.drawName();
        stage.addChild(this._graphic);
        this.setPos(this._location);
        this._state = state;
    };

    drawName() {
        if (this._playerName !== null)
            this._graphic.removeChild(this._playerName);
        this._playerName = new PIXI.Text(PLAYER_NAME, {font: "24px Arial", fill: "yellow", align: "center"});
        this._playerName.anchor.set(0.5);
        this._graphic.addChild(this._playerName);
    };

    animate() {
        if (this._state === Unit.Status.MOVING) {
            if (this._lerp._active) {
                let at = this._lerp.update();
                this._graphic.position.x = at.x;
                this._graphic.position.y = at.y;
            } else if (this._movePath.length > 0) {
                const nextTile = this._movePath.shift();
                const dir = nextTile.subtract(this._location).asDir();
                this.turn(dir);
                this.lerpToTile(nextTile);
            } else {
                this.changeState(Unit.Status.READY);
            }
        } else if (this._state === Unit.Status.PULLING) {
            if (typeof this._isPulling === 'undefined' ||
                this._isPulling.hasOwnProperty('_state') &&
                this._isPulling._state !== Unit.Status.PULLED)
                this.changeState(Unit.Status.READY);
        }

    }
}

class SpriteLerp {
    constructor() {
        this._active = false;
    }

    start(a, b, ticks) {
        this._active = true;
        this._from = a;
        this._to = b;
        this._startActionTime = Date.now();
        this._endActionTime = this._startActionTime + (ticks * GAME_TICK);
    }

    update() {
        if (this.isFinished()) {
            this._active = false;
            return this._to;
        }

        let curTime = Date.now() - this._startActionTime;
        let endTime = this._endActionTime - this._startActionTime;
        let percentageMoved = curTime * 1.0 / endTime;

        let lerpX = (this._to.x - this._from.x) * percentageMoved;
        let lerpY = (this._to.y - this._from.y) * percentageMoved;

        return new Point(this._from.x + lerpX, this._from.y + lerpY);
    }

    isFinished() {
        return this._endActionTime <= Date.now();
    }
}

FindTilePath = (startTile, endTile) => {
    if (endTile._passable === false ||
        startTile.equals(endTile))
        return [];

    let frontier = new PriorityQueue();
    frontier.put(endTile, 0);
    let goingTo = new Map();
    goingTo.set(endTile, null);
    let costSoFar = new Map();
    costSoFar.set(endTile, 0);
    let current;

    while (!frontier.isEmpty()) {
        current = frontier.get();
        if (current.equals(startTile)) {
            let movePath = [];
            do {
                current = goingTo.get(current);
                movePath.push(current);
            } while (goingTo.get(current) !== null);
            return movePath;
        }
        for (let p in current.neighbors) {
            const previous = current.neighbors[p];
            if (previous._passable === false) continue;
            const newCost = costSoFar.get(current) + previous.pathTraversalTime;
            if (costSoFar.has(previous) === false || newCost < costSoFar.get(previous)) {
                costSoFar.set(previous, newCost);
                const priority = newCost + startTile.distance(previous);
                frontier.put(previous, priority);
                goingTo.set(previous, current);
            }
        }
    }
    return [];
};

class QElement {
    constructor(element, priority) {
        this.element = element;
        this.priority = priority;
    }
}

class PriorityQueue {
    constructor() {
        this.items = [];
    }

    put(element, priority) {
        let qElement = new QElement(element, priority);
        let contain = false;

        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > qElement.priority) {
                this.items.splice(i, 0, qElement);
                contain = true;
                break;
            }
        }

        if (!contain) this.items.push(qElement);
    }

    get() {
        if (this.isEmpty()) return null;
        const cur = this.items.shift();
        return cur.element;
    }

    peek() {
        if (this.isEmpty()) return null;
        return this.items[0];
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

SimpleBoardLayout = (testTile, boardSize) => {
    return Math.max(Math.abs(testTile.q),
        Math.abs(testTile.r),
        Math.abs(testTile.s)) <= boardSize;
};

/*** Main Function Here vvvv
 *
 *
 *
 *
 *
 *
 *
 */
function setup() {
    stage.position.x = renderer.width/2;
    stage.position.y = renderer.height/2;

    board = new Board(SimpleBoardLayout);
    let t = board.getTile(PLAYER_START_POS[0],PLAYER_START_POS[1],PLAYER_START_POS[2]);
    player = new Player(t);

    t = board.getTile(0,0,0);
    ship = new Ship(t);

    generateOrbs(5);

    document.getElementById("nameChanger").addEventListener("submit", updateName, false);

    gameLoop();
    animationLoop();

    resetTimer();
}

function generateOrbs(numOrbs) {
    for (let i = 0; i < numOrbs; i++) {
        let loc, x, y;

        do {
            x = Math.floor(Math.random() * BOARD_SIZE) - Math.floor(BOARD_SIZE / 2);
            y = Math.floor(Math.random() * BOARD_SIZE) - Math.floor(BOARD_SIZE / 2);
            loc = board.getTile(x,y, -(x+y));
        } while (Math.abs(x) < 3 && Math.abs(y) < 3 || loc._passable === false);

        new Orb(loc, i);
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    //state();
    t.update();
    renderer.render(stage);
}

function animationLoop() {
    requestAnimationFrame(animationLoop);

    player.animate();
    for (let o in orbs) {
        orbs[o].animate();
    }

    stage.pivot.copyFrom(player._graphic.position);

    if (MOUSE_MOVEMENT) {
        if (updatePointer() === "onTile") {
            if (clickDelay === 0) {
                player.moveTo(board.findTileByPos(pointer.x, pointer.y));
                clickDelay = Date.now() + GAME_TICK;
            }
        }
        if (clickDelay > 0 && clickDelay < Date.now()) {
            clickDelay = 0;
        }
    } else {
        updatePointer();
    }


    renderer.render(stage);
}

window.addEventListener("keydown", function(event) {
    if (NameInputBox !== document.activeElement) {
        event.preventDefault();
        userInput(event.key);
    }
});

function userInput(key) {
    if (['q','a','w','s','e','d'].includes(key)) {
        player.move(key, 1);
    }
}

function updatePointer() {
    let hoverObject = false;
    let action = null;
    for (let o in orbs) {
        if (!orbs.hasOwnProperty(o)) continue;
        if (pointer.hitTestSprite(orbs[o]._graphic)) {
            pointer.cursor = "pointer";
            hoverObject = true;
            if (pointer.isDown) {
                action = "onOrb";
                player.pull(orbs[o]);
            }
        }
    }
    if (!hoverObject)
        pointer.cursor = "auto";
    return (action !== "onOrb" && pointer.isDown) ? "onTile" : action;
}

function updateName(e) {
    e.preventDefault();
    PLAYER_NAME = NameInputBox.value;
    player.drawName();
    NameInputBox.blur();
}

function resetTimer() {
    let CountdownTimer = new Date();
    CountdownTimer.setSeconds(CountdownTimer.getSeconds() + GAME_LENGTH);

    TimerInterval = setInterval(function() {
        // Get today's date and time
        const now = new Date().getTime();

        // Find the distance between now and the count down date
        const distance = CountdownTimer - now;

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(TimerInterval);
            highScore = (score > highScore) ? score : highScore;
            score = 0;
            ScoreText.innerHTML = `Score: 0<br>High Score: ${highScore}`;
            TimeSound.play();
            for (o in orbs) {
                orbs[o].resetPos();
            }
            resetTimer();
            document.getElementById("timer").innerText = "1:30";
            return;
        }

        // Time calculations for minutes and seconds
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result in the element with id="demo"
        document.getElementById("timer").innerHTML = `${minutes}:${('0' + seconds).slice(-2)}`;

    }, 1000);
}