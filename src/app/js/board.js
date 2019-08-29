/***
 * Game Parameters
 */
const SCREEN_HEIGHT = 960;
const SCREEN_WIDTH = 640;
const BOARD_SIZE = 15;
const GAME_TICK = 500;
const PLAYER_START_POS = [2,-1,-1];
const DEBUG = false;

const GAME_LENGTH = 90;
let TimerInterval;
const TimeSound = new Howl({
    src: ['../audio/steamwhistle_0.wav']
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

class Tile {
    constructor(x,y,z, offsetX, offsetY) {
        this._graphic = new PIXI.Sprite(
            PIXI.loader.resources["../img/hextile.png"].texture
        );
        this._passable = true;
        this._hex = new Hex(x,y,z);
        this.draw(stage, offsetX, offsetY)
    }
    getCoords() {
        return `${this._hex.coords[0]},${this._hex.coords[1]},${this._hex.coords[2]}`;
    }
    getPixelCoords() {
        return new Point(this._graphic.x, this._graphic.y);
    }
    draw(stage, dx, dy) {
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
}

class Board {
    move(unit, direction, ticks) {
        if (unit._state === UnitStatus.MOVING || unit._lerp._active)
            return;
        if (unit._state === UnitStatus.PULLING)
            unit.cancelPull();

        let hex = unit._location._hex;
        let neighbor = hex.neighbor(direction);
        let dest = this.getTileFromHex(neighbor);
        if (dest._passable === false) {
            return;
        }
        unit.changeState(UnitStatus.MOVING);
        let from = new Point(unit._graphic.x, unit._graphic.y);
        let to = new Point(dest._graphic.x + unit._offsetX,
            dest._graphic.y + unit._offsetY);
        unit.turn(direction);
        unit._lerp.start(from, to, ticks);
        unit._location = dest;
    }

    pull(unit, obj) {
        if (unit._state === UnitStatus.MOVING || unit._lerp._active)
            return;
        if (unit._state === UnitStatus.PULLING)
            unit.cancelPull();

        let fromHex = obj._location._hex;
        let toHex = unit._location._hex;
        let hexPath = fromHex.linedraw(toHex);

        // Ignoring the start and end points, is there a path?
        if (hexPath.length - 2 <= 0)
            return;

        let hexdir = hexPath[hexPath.length - 2].subtract(hexPath[hexPath.length - 1]);
        let dir = Hex.directionsInverted[`${hexdir.q},${hexdir.r},${hexdir.s}`];
        unit.turn(dir);

        // Get all tiles for the corresponding hexes
        let tilePath = [];
        for (let i = 1; i < hexPath.length - 1; i++) {
            tilePath.push(this.getTileFromHex(hexPath[i]));
        }
        obj.pull(tilePath);
        unit.pull(obj);
    }

    getTile(x, y, z) {
        return this._tilemap[`${x},${y},${z}`];
    }

    getTileFromHex(hex) {
        return this.getTile(hex.coords[0], hex.coords[1], hex.coords[2]);
    }

    constructor(size) {
        this._boardSize = size;
        this._tilemap = {};

        let tile = new Tile(0,0,0, 0, 0);
        this._tilemap[tile.getCoords()] = tile;

        for (let spiral = 1; spiral <= this._boardSize; spiral++) {
            let dx = 0;
            let dy = -1 * spiral;

            // Starts at x = 0, y = n, z = -n
            let x = 0;
            let y = spiral;
            let z = -1 * spiral;
            tile = new Tile(x, y, z, dx, dy);
            this._tilemap[tile.getCoords()] = tile;

            // As y decreases to 0, x increases to n
            for (; x < spiral; x++, y--, dx+=0.75, dy+=0.5) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }

            // As z increases to 0, y decreases to -n
            for (; y > -1 * spiral; z++, y--, dy+=1) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }

            // As x decreases to 0, z increases to n
            for (; z < spiral; z++, x--, dx-=0.75, dy +=0.5) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }

            // As y increases to 0, x decreases to -n
            for (; y < 0; y++, x--, dx-=0.75, dy -=0.5) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }

            // As z decreases to 0, y increases to n
            for (; y < spiral; y++, z--, dy-=1) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }

            // As x increases to 0, z decreases to -n
            for (; x < 0; x++, z--, dx+=0.75, dy-=0.5) {
                tile = new Tile(x, y, z, dx, dy);
                this._tilemap[tile.getCoords()] = tile;
            }
        }
    }
}

class Ship {
    constructor(tile, board) {
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

        this.storeTilesUnderShip(board, this._center, this._shipRadius);

        for (let t in this._tiles)
            this._tiles[t]._passable = false;
    }

    storeTilesUnderShip(b, tile, radius) {
        if (!this.isOnTile(tile))
            this._tiles.push(tile);
        if (radius > 0) {
            for (let key in Hex.directions) {
                let nHex = tile._hex.neighbor(key);
                let dest = b.getTileFromHex(nHex);
                this.storeTilesUnderShip(b, dest, radius - 1);
            }
        }
    }

    isOnTile(tile) {
        return this._tiles.includes(tile);
    }
}

class Orb {
    // 59 x 58 sprite
    constructor(tile, id) {
        this._state = UnitStatus.READY;
        this._movePath = [];
        this._lerp = new SpriteLerp();
        this._texture = PIXI.loader.resources["orb"].texture;
        this._scoreSound = new Howl({
            src: ['../audio/shimmer_1.flac']
        });

        this._offsetX = -tile._graphic.width/4;
        this._offsetY = -tile._graphic.width/3;
        let rect = new PIXI.Rectangle(0,64,32,32);
        this._texture.frame = rect;
        this._graphic = new PIXI.Sprite(this._texture);

        this._anim = setInterval(function() {
            rect.x += 32;
            if (rect.x >= 32 * 3) rect.x = 0;
            orbs[id]._graphic.texture.frame = rect;
        }, 50);

        stage.addChild(this._graphic);
        this.setPos(tile);
        orbs[id] = this;
    }

    setPos(tile) {
        this._graphic.position.copyFrom(tile._graphic.position);
        this._graphic.position.x += this._offsetX;
        this._graphic.position.y += this._offsetY;
        this._location = tile;
    }

    pull(path) {
        this._movePath = path;
        this._state = UnitStatus.PULLED;
    }

    stopPull() {
        this._movePath = [];
        this._state = UnitStatus.READY;
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
        this._scoreSound.play();
        score += 1;
        this.resetPos();
        this._state = UnitStatus.READY;
        ScoreText.innerHTML = `Score: ${score}<br>High Score: ${highScore}`;
    }

    animate() {
        if (this._lerp._active) {
            let at = this._lerp.update();
            this._graphic.position.x = at.x;
            this._graphic.position.y = at.y;
        } else if (this._state === UnitStatus.PULLED) {
            if (this.hasReachedShip()) {
                this.score();
            }
            else if (this._movePath.length > 0) {
                let nextTile = this._movePath.shift();

                if (Orb.pathIsImpassable(nextTile)) this.stopPull();

                let from = new Point(this._graphic.x, this._graphic.y);
                let to = nextTile.getPixelCoords();
                to.x += this._offsetX;
                to.y += this._offsetY;
                this._location = nextTile;
                this._lerp.start(from, to, 1);
            } else {
                this._state = UnitStatus.READY;
            }

        }

    }
}

UnitStatus = {
    MOVING: 50,
    PULLING: 30,
    PULLED: 25,
    READY: 1
};

class Player {
    constructor(tile) {
        this._isPulling = false;
        this._lerp = new SpriteLerp();
        this._texture = PIXI.loader.resources["player"].texture;
        this._state = UnitStatus.READY;
        this._offsetX = -tile._graphic.width/4;
        this._offsetY = -tile._graphic.height/3;
        this._playerName = null;

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
        this.setPos(tile);
    }

    setPos(tile) {
        this._graphic.position.copyFrom(tile._graphic.position);
        this._graphic.position.x += this._offsetX;
        this._graphic.position.y += this._offsetY;
        this._location = tile;
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
        console.log("Pulling object:");
        console.log(obj);
        this._isPulling = obj;
        this.changeState(UnitStatus.PULLING);
    }

    cancelPull() {
        console.log("Cancel pull...");
        this._isPulling.cancelPull();
        this.changeState(UnitStatus.READY);
    }

    changeState(state) {
        switch(state) {
            case UnitStatus.MOVING:
                console.log("Player is moving...");
                this._texture = PIXI.loader.resources["player-move"].texture;
                break;
            case UnitStatus.PULLING:
                console.log("Player is pulling...");
                this._texture = PIXI.loader.resources["player-pull"].texture;
                break;
            case UnitStatus.READY:
                console.log("Player is idle.");
                this._texture = PIXI.loader.resources["player"].texture;
                break;
            default:
                console.error(`ERROR: ${state.toString()} is not a valid state. Using READY state.`);
                this._texture = PIXI.loader.resources["player"].texture;
                state = UnitStatus.READY;
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
    }

    animate() {
        if (this._state === UnitStatus.MOVING) {
            if (this._lerp._active) {
                let at = this._lerp.update();
                this._graphic.position.x = at.x;
                this._graphic.position.y = at.y;
            } else {
                this.changeState(UnitStatus.READY);
            }
        } else if (this._state === UnitStatus.PULLING) {
            if (typeof this._isPulling === 'undefined' ||
                this._isPulling.hasOwnProperty('_state') &&
                this._isPulling._state !== UnitStatus.PULLED)
                this.changeState(UnitStatus.READY);
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

    board = new Board(BOARD_SIZE);
    let t = board.getTile(PLAYER_START_POS[0],PLAYER_START_POS[1],PLAYER_START_POS[2]);
    player = new Player(t);

    t = board.getTile(0,0,0);
    ship = new Ship(t, board);

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

    updatePointer();

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
        board.move(player, key, 1);
    }
}

function updatePointer() {
    let hoverObject = false;
    for (let o in orbs) {
        if (!orbs.hasOwnProperty(o)) continue;
        if (pointer.hitTestSprite(orbs[o]._graphic)) {
            pointer.cursor = "pointer";
            hoverObject = true;
            if (pointer.isDown) {
                board.pull(player, orbs[o]);
            }
        }
    }
    if (!hoverObject)
        pointer.cursor = "auto";
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