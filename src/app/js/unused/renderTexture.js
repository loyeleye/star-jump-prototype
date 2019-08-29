_world.map = data.map;
var ll = 0, rr = 0;
var r = 0;
var myContainer = new PIXI.DisplayObjectContainer();
for (var row in _world.map) {
    var c = 0;
    for (var col in  _world.map[row]) {
        var tileTexture = new PIXI.Texture.fromImage('assets/images/world/map/' + _world.map[row][col] + '.png');
        var tile = new PIXI.Sprite(tileTexture);
        tile.position.x = c * 64 + ll;
        tile.position.y = r * 64 + rr;
        var da = String(r) + String(c);
        _world.entities[da] = tile;
        myContainer.addChild(tile);
        c++;
    }
    r++;
}
var texture = new PIXI.RenderTexture();
texture.render(myContainer);
var background = new PIXI.Sprite(texture);
_camera[data.sector].addChild(background);
map = data.map;
