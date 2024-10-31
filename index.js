var ROWS = 24;
var COLS = 40;
var TILE_SIZE = 50;
var ENEMY_DAMAGE = 20;

// The range is [min; max] (both inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (1 + max - min) + min);
}

function uniq(array, equalsFn) {
    var result = [];

    for (var i = 0; i < array.length; i++) {
        var index = result.findIndex(function (value) {
            return equalsFn(value, array[i]);
        });

        if (index === -1) {
            result.push(array[i]);
        }
    }

    return result;
}

function Position(row, col) {
    this.row = row;
    this.col = col;
}

Position.prototype.equals = function (other) {
    return this.row === other.row && this.col === other.col;
};

Position.prototype.toIndex = function () {
    return this.row * COLS + this.col;
};

// Here, adjacent means "can attack"
Position.prototype.isAdjacentTo = function (other) {
    var rowDistance = Math.abs(this.row - other.row);
    var colDistance = Math.abs(this.col - other.col);
    return rowDistance <= 1 && colDistance <= 1;
};

var TileKind = {
    Empty: 0,
    Wall: 1
};

function State() {
    do {
        this.createWallField();
        this.generateRooms();
        this.generateHorizontalCorridors();
        this.generateVerticalCorridors();
    }
    while (this.hasUnreachableTiles());

    this.generateSwords();
    this.generatePotions();
    this.generateEnemies();
    this.generatePlayer();
}

State.prototype.createWallField = function () {
    this.field = new Array(ROWS);

    for (var i = 0; i < ROWS; i++) {
        this.field[i] = new Array(COLS);

        for (var j = 0; j < COLS; j++) {
            this.field[i][j] = TileKind.Wall;
        }
    }
};

State.prototype.generateRooms = function () {
    var count = getRandomInt(5, 10);

    for (var i = 0; i < count; i++) {
        var width = getRandomInt(3, 8);
        var height = getRandomInt(3, 8);

        var row = getRandomInt(0, ROWS - 1 - height);
        var col = getRandomInt(0, COLS - 1 - width);

        for (var j = row; j < row + height; j++) {
            for (var k = col; k < col + width; k++) {
                this.field[j][k] = TileKind.Empty;
            }
        }
    }
};

State.prototype.generateHorizontalCorridors = function () {
    var count = getRandomInt(3, 5);

    for (var i = 0; i < count; i++) {
        var row = getRandomInt(0, ROWS - 1);

        for (var j = 0; j < COLS; j++) {
            this.field[row][j] = TileKind.Empty;
        }
    }
};

State.prototype.generateVerticalCorridors = function () {
    var count = getRandomInt(3, 5);

    for (var i = 0; i < count; i++) {
        var col = getRandomInt(0, COLS - 1);

        for (var j = 0; j < ROWS; j++) {
            this.field[j][col] = TileKind.Empty;
        }
    }
};

var TileReachability = {
    Reachable: 0,
    Unreachable: 1,
    Wall: 2
};

State.prototype.hasUnreachableTiles = function () {
    var field = this.mapField();
    var queue = [this.findFirstEmptyTile()];
    var position;

    while (position = queue.pop()) {
        var row = position.row;
        var col = position.col;

        field[row][col] = TileReachability.Reachable;

        // Top
        if (row !== 0 && field[row - 1][col] === TileReachability.Unreachable) {
            queue.push(new Position(row - 1, col));
        }

        // Left
        if (col !== 0 && field[row][col - 1] === TileReachability.Unreachable) {
            queue.push(new Position(row, col - 1));
        }

        // Bottom
        if (row !== ROWS - 1 && field[row + 1][col] === TileReachability.Unreachable) {
            queue.push(new Position(row + 1, col));
        }

        // Right
        if (col !== COLS - 1 && field[row][col + 1] === TileReachability.Unreachable) {
            queue.push(new Position(row, col + 1));
        }
    }

    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            if (field[i][j] === TileReachability.Unreachable) {
                return true;
            }
        }
    }

    return false;
};

// Convert the field to a three-state reachability map
State.prototype.mapField = function () {
    var field = new Array(ROWS);

    for (var i = 0; i < ROWS; i++) {
        field[i] = new Array(COLS);

        for (var j = 0; j < COLS; j++) {
            if (this.field[i][j] === TileKind.Empty) {
                field[i][j] = TileReachability.Unreachable;
            }
            else {
                field[i][j] = TileReachability.Wall;
            }
        }
    }

    return field;
};

State.prototype.findFirstEmptyTile = function () {
    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            if (this.field[i][j] === TileKind.Empty) {
                return new Position(i, j);
            }
        }
    }
};

State.prototype.generateSwords = function () {
    this.swords = [];

    for (var i = 0; i < 2; i++) {
        this.swords[i] = this.findRandomEmptyTile();
    }
};

State.prototype.generatePotions = function () {
    this.potions = [];

    for (var i = 0; i < 10; i++) {
        this.potions[i] = this.findRandomEmptyTile();
    }
};

State.prototype.generateEnemies = function () {
    this.enemies = [];

    for (var i = 0; i < 10; i++) {
        this.enemies[i] = new Enemy(this.findRandomEmptyTile());
    }
};

State.prototype.generatePlayer = function () {
    this.player = new Player(this.findRandomEmptyTile());
}

State.prototype.findRandomEmptyTile = function () {
    var occupiedPositions = [];

    if (this.player) {
        occupiedPositions.push(this.player.position);
    }

    if (this.enemies) {
        occupiedPositions.push.apply(occupiedPositions, this.enemies.map(function (enemy) { return enemy.position; }));
    }

    if (this.swords) {
        occupiedPositions.push.apply(occupiedPositions, this.swords);
    }

    if (this.potions) {
        occupiedPositions.push.apply(occupiedPositions, this.potions);
    }

    var count = 0;

    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            if (this.field[i][j] === TileKind.Wall) {
                continue;
            }

            var occupied = occupiedPositions.some(function (position) {
                return position.equals(new Position(i, j));
            })

            if (occupied) {
                continue;
            }

            count++;
        }
    }

    var flatIndex = getRandomInt(0, count - 1);
    var currentFlatIndex = 0;

    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            if (this.field[i][j] === TileKind.Wall) {
                continue;
            }

            var occupied = occupiedPositions.some(function (position) {
                return position.equals(new Position(i, j));
            })

            if (occupied) {
                continue;
            }

            if (currentFlatIndex === flatIndex) {
                return new Position(i, j);
            }

            currentFlatIndex++;
        }
    }
};

var Direction = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3
};

State.prototype.getNewPlayerPosition = function (direction) {
    var row = this.player.position.row;
    var col = this.player.position.col;

    var newRow = row;
    var newCol = col;

    switch (direction) {
        case Direction.Up:
            newRow--;
            break;
        case Direction.Left:
            newCol--;
            break;
        case Direction.Down:
            newRow++;
            break;
        case Direction.Right:
            newCol++;
            break;
    }

    var newPosition = new Position(newRow, newCol);

    if (newRow < 0 || newCol < 0 || newRow >= ROWS || newCol >= COLS) {
        return this.player.position;
    }

    if (this.field[newRow][newCol] === TileKind.Wall) {
        return this.player.position;
    }

    var enemyAlreadyThere = this.enemies.some(function (enemy) {
        return enemy.position.equals(newPosition);
    });

    if (enemyAlreadyThere) {
        return this.player.position;
    }

    return newPosition;
};

// This method (as well as some others below) changes the game state and returns affected tile positions (needed later for DOM patching)
State.prototype.movePlayer = function (newPlayerPosition) {
    var positionsAffected = [
        this.player.position,
        newPlayerPosition
    ];

    this.player.position = newPlayerPosition;

    // Any potion at the new position?
    var potionIndex = this.potions.findIndex(function (position) {
        return position.equals(newPlayerPosition);
    });

    if (potionIndex !== -1) {
        this.potions.splice(potionIndex, 1);
        this.player.potions++;
    }
    else {
        // Maybe a sword?
        var swordIndex = this.swords.findIndex(function (position) {
            return position.equals(newPlayerPosition);
        });

        if (swordIndex !== -1) {
            this.swords.splice(swordIndex, 1);
            this.player.swords++;
        }
    }

    return positionsAffected;
};

State.prototype.performPlayerAttack = function () {
    var positionsAffected = [];

    for (var i = 0; i < this.enemies.length; i++) {
        var enemy = this.enemies[i];

        if (!enemy.position.isAdjacentTo(this.player.position)) {
            continue;
        }

        enemy.health -= this.player.getDamage();

        if (enemy.health <= 0) {
            this.enemies.splice(i, 1);

            // Important: prevent the classic in-place filtration problem
            i--;
        }

        positionsAffected.push(enemy.position);
    }

    return positionsAffected;
};

State.prototype.performEnemyTurns = function () {
    var positionsAffected = [];

    // This flag is an optimization attempt
    // All duplicates are gonna end up filtered out anyways
    var damageDealtToPlayer = false;

    for (var i = 0; i < this.enemies.length; i++) {
        var enemy = this.enemies[i];

        if (enemy.position.isAdjacentTo(this.player.position)) {
            this.player.health -= ENEMY_DAMAGE;
            damageDealtToPlayer = true;
        }
        else {
            var row = enemy.position.row;
            var col = enemy.position.col;

            var adjacentPositions = [
                new Position(row - 1, col),
                new Position(row, col - 1),
                new Position(row + 1, col),
                new Position(row, col + 1)
            ];

            var self = this;

            var adjacentEmptyPositions = adjacentPositions.filter(function (position) {
                return position.row >= 0
                    && position.col >= 0
                    && position.row < ROWS
                    && position.col < COLS
                    && self.field[position.row][position.col] === TileKind.Empty
                    && !self.swords.some(function (sword) { return sword.equals(position); })
                    && !self.potions.some(function (potion) { return potion.equals(position); })
                    && !self.enemies.some(function (enemy) { return enemy.position.equals(position); });
            });

            if (adjacentEmptyPositions.length === 0) {
                continue;
            }

            var index = getRandomInt(0, adjacentEmptyPositions.length - 1);
            var newPosition = adjacentEmptyPositions[index];

            positionsAffected.push(enemy.position);
            positionsAffected.push(newPosition);

            enemy.position = newPosition;
        }
    }

    if (damageDealtToPlayer) {
        positionsAffected.push(this.player.position);
    }

    return positionsAffected;
};

function Renderer() {
    this.field = $(".field");
    this.inventory = $(".inventory");
}

// Create and mount all the tiles
// This happens only once
Renderer.prototype.mount = function (state) {
    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            var node = $("<div></div>")
                .addClass("tile")
                .css("top", TILE_SIZE * i + "px")
                .css("left", TILE_SIZE * j + "px");

            if (state.field[i][j] === TileKind.Wall) {
                node.addClass("tileW");
            }

            this.field.append(node);
        }
    }

    for (var i = 0; i < state.swords.length; i++) {
        this.field.children()
            .eq(state.swords[i].toIndex())
            .addClass("tileSW");
    }

    for (var i = 0; i < state.potions.length; i++) {
        this.field.children()
            .eq(state.potions[i].toIndex())
            .addClass("tileHP");
    }

    for (var i = 0; i < state.enemies.length; i++) {
        var enemy = state.enemies[i];

        this.field.children()
            .eq(enemy.position.toIndex())
            .addClass("tileE")
            .append(this.createHealthBar(enemy.health));
    }

    this.field.children()
        .eq(state.player.position.toIndex())
        .addClass("tileP")
        .append(this.createHealthBar(state.player.health));
};

// Update the DOM to reflect the changes made during the turn
// We try to do it as effectively as possible,
// yet without introducing a VDOM implementation or something as complex
// So we track the positions affected and carefully patch their corresponding tile nodes
// under certain assumptions
Renderer.prototype.update = function (state, positionsAffected) {
    for (var i = 0; i < positionsAffected.length; i++) {
        var position = positionsAffected[i];
        var node = this.field.children().eq(position.toIndex());

        // Is the player present on this tile?
        if (state.player.position.equals(position)) {
            node.attr("class", "tile tileP");
            this.patchHealthBar(node, state.player.health);
            continue;
        }

        // Is an enemy present on this tile?
        var enemy = state.enemies.find(function (enemy) {
            return enemy.position.equals(position);
        });

        if (enemy) {
            node.attr("class", "tile tileE");
            this.patchHealthBar(node, enemy.health);
            continue;
        }

        // Otherwise, the tile is empty
        // as swords and potions can neither appear nor move
        // (and the walls never change)
        node.attr("class", "tile");

        // Make sure to remove any health bars
        node.children().remove();
    }
};

Renderer.prototype.addPotion = function (onClick) {
    var node = $("<img>")
        .attr("src", "images/tile-HP.png")
        .addClass("potion-icon")
        .on("click", function () {
            onClick();
            node.remove();
        })
        .appendTo(this.inventory);
};

Renderer.prototype.addSword = function () {
    $("<img>")
        .attr("src", "images/tile-SW.png")
        .appendTo(this.inventory);
};

Renderer.prototype.createHealthBar = function (health) {
    return $("<div></div>")
        .addClass("health")
        .css("width", health + "%");
};

// Update the health bar on the tile or create it if not present
Renderer.prototype.patchHealthBar = function (tileNode, health) {
    if (tileNode.children().length > 0) {
        tileNode.children().css("width", health + "%");
    }
    else {
        tileNode.append(this.createHealthBar(health));
    }
};

// In contrast with "update", this method changes all the nodes
// Basically it's a more preferable way to restart the game
// than unmounting existing nodes and then re-creating and re-mounting them
Renderer.prototype.reset = function (state) {
    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < COLS; j++) {
            var position = new Position(i, j);

            var node = this.field.children()
                .eq(position.toIndex())
                .attr("class", "tile");

            if (state.field[i][j] === TileKind.Wall) {
                node.addClass("tileW")
            }

            // Remove any health bars
            node.children().remove();
        }
    }

    for (var i = 0; i < state.swords.length; i++) {
        this.field.children()
            .eq(state.swords[i].toIndex())
            .addClass("tileSW");
    }

    for (var i = 0; i < state.potions.length; i++) {
        this.field.children()
            .eq(state.potions[i].toIndex())
            .addClass("tileHP");
    }

    for (var i = 0; i < state.enemies.length; i++) {
        var enemy = state.enemies[i];

        this.field.children()
            .eq(enemy.position.toIndex())
            .addClass("tileE")
            .append(this.createHealthBar(enemy.health));
    }

    this.field.children()
        .eq(state.player.position.toIndex())
        .addClass("tileP")
        .append(this.createHealthBar(state.player.health));

    this.inventory.children().remove();
};

Renderer.prototype.displayEndScreen = function (steps) {
    $("<div>Congratulations! You've finally made it.</div>")
        .addClass("end-screen")
        .append("<div>Steps taken: " + steps + "</div>")
        .appendTo($(document.body));

    $(document.body).css("overflow", "hidden");
};

function Game() { }

Game.prototype.init = function () {
    this.state = new State();
    this.renderer = new Renderer();
    this.viewport = new Viewport(this.state.player.position);
    this.steps = 0;

    this.renderer.mount(this.state);

    var self = this;

    $(document).on("keydown", function (e) {
        if (!e.repeat) {
            self.onKeyPress(e.code);
        }
    });
};

// Key is KeyboardEvent's "code" property,
// i.e. "KeyW", "KeyA" etc.
Game.prototype.onKeyPress = function (key) {
    var direction;
    var attack = false;

    switch (key) {
        case "KeyW":
            direction = Direction.Up;
            break;
        case "KeyA":
            direction = Direction.Left;
            break;
        case "KeyS":
            direction = Direction.Down;
            break;
        case "KeyD":
            direction = Direction.Right;
            break;
        case "Space":
            attack = true;
            break;
        default:
            return;
    }

    var positionsAffected;
    var oldPotions = this.state.player.potions;
    var oldSwords = this.state.player.swords;

    // A player's turn is either an attack or a move
    if (attack) {
        this.steps++;

        positionsAffected = this.state.performPlayerAttack();

        if (this.state.enemies.length === 0) {
            this.renderer.displayEndScreen(this.steps);
            return;
        }
    }
    else {
        var newPlayerPosition = this.state.getNewPlayerPosition(direction);

        if (newPlayerPosition.equals(this.state.player.position)) {
            return;
        }

        this.steps++;

        positionsAffected = this.state.movePlayer(newPlayerPosition);
        this.viewport.centerOn(newPlayerPosition);

        if (this.state.player.potions !== oldPotions) {
            this.renderer.addPotion(this.onPotionUse.bind(this));
        }
        else if (this.state.player.swords !== oldSwords) {
            this.renderer.addSword();
        }
    }

    this.finishTurn(positionsAffected);
};

Game.prototype.onPotionUse = function () {
    this.steps++;

    this.state.player.health = 100;
    this.state.player.potions--;
    this.finishTurn([this.state.player.position]);
};

// This method is called when the player's move has already been handled
// It performs enemies' turns and handles potential game overs,
// and also passes the changes to the renderer
Game.prototype.finishTurn = function (positionsAffected) {
    var positionsAffectedByEnemyTurns = this.state.performEnemyTurns();

    // Game over :(
    if (this.state.player.health <= 0) {
        this.state = new State();
        this.viewport.centerOn(this.state.player.position);
        this.renderer.reset(this.state);
        return;
    }

    positionsAffected.push.apply(positionsAffected, positionsAffectedByEnemyTurns);

    var dedupped = uniq(positionsAffected, function (a, b) {
        return a.equals(b);
    });

    this.renderer.update(this.state, dedupped);
};

function Player(position) {
    this.position = position;
    this.health = 100;
    this.potions = 0;
    this.swords = 0;
}

Player.prototype.getDamage = function () {
    return 20 + this.swords * 40;
};

function Enemy(position) {
    this.position = position;
    this.health = 100;
}

// Creates a Viewport centered on the given tile
function Viewport(position) {
    this.field = $(".field");
    this.viewportRows = Math.floor(this.field.height() / TILE_SIZE);
    this.viewportCols = Math.floor(this.field.width() / TILE_SIZE);
    this.centerOn(position);
};

Viewport.prototype.centerOn = function (position) {
    // Important: don't floor at this point
    // The remainder is needed for compensation flags
    this.rowOffset = position.row - this.viewportRows / 2;
    this.colOffset = position.col - this.viewportCols / 2;

    var compensateBottom = this.rowOffset > this.viewportRows;
    var compensateRight = this.colOffset > this.viewportCols;

    this.rowOffset = Math.floor(this.rowOffset);
    this.colOffset = Math.floor(this.colOffset);

    this.rowOffset = Math.min(Math.max(this.rowOffset, 0), ROWS - 1 - this.viewportRows);
    this.colOffset = Math.min(Math.max(this.colOffset, 0), COLS - 1 - this.viewportCols);

    this.apply(compensateBottom, compensateRight);
};

// The params are flags used for detecting the corner case when
// we've reached the right/bottom border and should shift the viewport
// to contain the remaining space that doesn't fit otherwise
Viewport.prototype.apply = function (compensateBottom, compensateRight) {
    var top;
    var left;

    if (compensateBottom) {
        top = this.field.height() - ROWS * TILE_SIZE;
    }
    else {
        top = -this.rowOffset * TILE_SIZE;
    }

    if (compensateRight) {
        left = this.field.width() - COLS * TILE_SIZE;
    }
    else {
        left = -this.colOffset * TILE_SIZE;
    }

    this.field
        .css("top", top + "px")
        .css("left", left + "px");
};
