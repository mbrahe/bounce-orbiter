(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Globals = require('./globals.js');
var Graphics = require('./graphics.js');
var GameObject = require('./gameobject.js');
var Physics = require('./physics.js');
var Input = require('./input.js');
var Vector = require('./vector.js');
var Level = require('./level.js');

var Game = {};

// Call Game.init to initialize this
Game.deltaTime = undefined;

Game.init = function (resolution, deltaTime) {
	Level.start();

    Globals.timers.addTimer("Level Timer");

	var canvas = Graphics.init(resolution);
	Input.init();
    setInterval(Game.Update, deltaTime * 1000);

    Graphics.mainCamera.centerOn(GameObject.getTag("Player")[0].position);

    return canvas;
}

Game.Update = function () {
	Graphics.clearScreen();

    GameObject.objects.update(Globals.deltaTime);

    Physics.checkAllCollisions(GameObject.objects);

    Graphics.mainCamera.follow(GameObject.getTag("Player")[0].position, Vector(.3, .4), 200, Globals.deltaTime);

    GameObject.objects.draw();

    Graphics.drawGUI();
}

module.exports = Game;
},{"./gameobject.js":2,"./globals.js":3,"./graphics.js":5,"./input.js":7,"./level.js":8,"./physics.js":10,"./vector.js":14}],2:[function(require,module,exports){
Vector = require('./vector.js');
Game = require('./game.js');

GameObject = function(position, radius, tag, static, ignoreCollisions, deltaTime) {
	gameObject = {};

	if (!position) {
		throw Error("Improper arguments for creating a gameObject")
	}

	if (radius === undefined) {
		throw Error("Improper arguments for creating a gameObject")
	}

	if (!tag) {
		throw Error("Improper arguments for creating a gameObject")
	}

	gameObject.position = position;
	gameObject.velocity = Vector(0,0);
	gameObject.radius = radius;
	gameObject.bounce = 0;
	gameObject.static = static;
	gameObject.ignoreCollisions = ignoreCollisions;
	gameObject.tag = tag;

	// Since GameObject is initialized before Game, we have to store deltaTime here each frame
	var dt;
	if (deltaTime) {
		dt = deltaTime;
	}

	gameObject.eachFrame = function(deltaTime) {
		if (deltaTime !== undefined) {
			dt = deltaTime;
		}
		if (this.update) {
			this.update(dt);
		}

		this.position = this.position.add(this.velocity.scale(dt));
	}

	gameObject.addForce = function (force) {
		// check force is a vector
		this.velocity = this.velocity.add(force.scale(dt));
		return this.velocity;
	}

	gameObject.closestObject = function (objects) {
		var self = this;

		var closestObj;
		var distance;

		objects.forEach(function (obj) {
			var tempDistance = obj.position.add(self.position.scale(-1));
			
			// Calculate from surface, not center
			var actualDistance = tempDistance.add(tempDistance.normalized().scale(-(obj.radius + self.radius))).magnitude();

			if (actualDistance < distance) {
				closestObj = obj;
				distance = actualDistance;
			} else if (distance === undefined) {
				closestObj = obj;
				distance = actualDistance;
			}
		})

		return closestObj;
	}

	GameObject.objects.push(gameObject);

	return gameObject;
}

GameObject.objects = [];

GameObject.getTag = function (tag) {
	var taggedObjects = [];
	for (var i = 0; i < this.objects.length; i++) {
		if (this.objects[i].tag === tag) {
			taggedObjects.push(this.objects[i]);
		}
	}

	return taggedObjects;
}

GameObject.destroy = function (gameObject) {
	for (var i = 0; i < GameObject.objects.length; i++) {
		if (GameObject.objects[i] == gameObject) {
			GameObject.objects.splice(i, 1);
		}
	}
}

GameObject.objects.update = function(dt) {
	this.forEach(function(obj) {
		obj.eachFrame(dt);
	});
}

GameObject.objects.draw = function() {
	this.forEach(function(obj) {
		if (obj.draw !== undefined) {
			obj.draw();
		}
	});
}



module.exports = GameObject;
},{"./game.js":1,"./vector.js":14}],3:[function(require,module,exports){
var Globals = {};

Globals.deltaTime = 1/60;

Globals.timers = [];
Globals.timers.addTimer = function (tag) {
	var timer = {};
	timer.begin = new Date();
	
	timer.getTime = function () {
		if (this.stopTime !== undefined) {
			return this.stopTime - this.begin;
		}
		return (new Date()) - this.begin;
	}

	timer.stop = function () {
		if (this.stopTime === undefined) {
			this.stopTime = new Date();
		}
	}

	timer.reset = function () {
		this.begin = new Date();
		this.stopTime = undefined;
	}

	this[tag] = timer;

	return timer;
}

module.exports = Globals;
},{}],4:[function(require,module,exports){
var GameObject = require('./gameobject.js');
var Globals = require('./globals.js');
var Graphics = require('./graphics.js');


var goalDistance = 20;

function Goal (homestar, angle) {
	var star = homestar
	var base = star.position.add(Vector.polar(homestar.radius, angle));

	var goal = GameObject(base, 0, "Goal", true, true);

	goal.draw = Graphics.Goal(base, angle, "white");

	goal.update = function () {
		var player = GameObject.getTag("Player")[0];
		var distance = player.position.add(this.position.scale(-1)).magnitude() - player.radius;
		if (distance <= goalDistance) {
			Globals.timers["Level Timer"].stop();
		}
	}

	return goal;
}

module.exports = Goal;
},{"./gameobject.js":2,"./globals.js":3,"./graphics.js":5}],5:[function(require,module,exports){
var Vector = require('./vector.js');
var Globals = require('./globals.js');

var Graphics = {};

// Call Graphics.init to initialize these
Graphics.mainCamera = undefined;
Graphics.dimensions = undefined;
Graphics.canvas = undefined;

Graphics.init = function (dimensions) {
	// Chack arguments are vectors
	var canvas = document.createElement("canvas");
    canvas.setAttribute("width", dimensions.x);
    canvas.setAttribute("height", dimensions.y);

    Graphics.canvas = canvas.getContext("2d");
    Graphics.dimensions = dimensions;

    Graphics.Camera(dimensions, Vector(0,0));

    return canvas;
}

Graphics.clearScreen = function () {
	Graphics.canvas.clearRect(0, 0, Graphics.dimensions.x, Graphics.dimensions.y);
    Graphics.canvas.fillStyle = "black";
    Graphics.canvas.fillRect(0, 0, Graphics.dimensions.x, Graphics.dimensions.y);
}

Graphics.text = function (message, pos, size) {
	var position = pos.add(Vector(0, size));

	Graphics.canvas.fillStyle = "white"
	Graphics.canvas.font = size + "px Sans-Serif"
	Graphics.canvas.fillText(message, position.x, position.y);
}

Graphics.drawGUI = function() {
	// Draws the time
	var decimalPlaces = 1;

	var time = Globals.timers["Level Timer"].getTime();
    time /= (Math.pow(10, 3 - decimalPlaces));
    time = Math.round(time).toString();
    if (time.length < decimalPlaces+1) {
        time = "0" + time;
    }
    time = time.slice(0, time.length - decimalPlaces) + "." + time.slice(time.length - decimalPlaces, time.length);

    Graphics.text(time, Vector(10, 10), 30)
}

Graphics.rotatePoints = function (pointArray, angle) {
	if (angle === undefined || isNaN(angle)) {
		throw Error("Function Graphics.rotatePoints requires a valid angle");
	}
	var rotated = pointArray.map(function (point) {
		return point.rotate(angle);
	})

	return rotated;
}

Graphics.pointsInCameraView = function (pointArray) {
	var cameraViewPoints = [];

	// Don't use map so that relativePosition function can use its own this
	pointArray.forEach(function(point) {
		cameraViewPoints.push(Graphics.mainCamera.relativePosition(point));
	});

	return cameraViewPoints;
}

Graphics.addToPoints = function (pointArray, vector) {
	if (vector === undefined) {
		throw Error("Function Graphics.addToPoints requires a valid vector");
	}
	var added = pointArray.map(function (point) {
		return point.add(vector);
	})

	return added;
}

Graphics.drawPoints = function (pointArray, color) {
	Graphics.canvas.strokeStyle=color;
	for (var i = 0; i < pointArray.length-1; i++) {
		Graphics.canvas.beginPath();
		Graphics.canvas.moveTo(pointArray[i].x, pointArray[i].y);
		Graphics.canvas.lineTo(pointArray[i+1].x, pointArray[i+1].y);
		Graphics.canvas.stroke();
	}
}

Graphics.Goal = function (base, angle, color) {
	var color = color;
	var height = 40;
	var flagSideLength = 20;

	var points = [];

	points[0] = Vector(0,0);
	points[1] = Vector.polar(height, 0);
	points[2] = points[1].add(Vector.polar(flagSideLength,  2 * Math.PI/3));
	points[3] = Vector.polar(height - flagSideLength, 0);

	points = Graphics.rotatePoints(points, angle);

	points = Graphics.addToPoints(points, base);

	function drawGoal() {
		Graphics.drawPoints(Graphics.pointsInCameraView(points), color);
	}

	return drawGoal;
}

Graphics.Circle = function (color) {

	var squashAmount = 1;
	var squashDirection = Vector(0,0);

	function drawCircle() {
		Graphics.canvas.strokeStyle = color;
		//Graphics.canvas.fillStyle = color;
    	Graphics.canvas.beginPath();
    	

    	var offset = squashDirection.rotate(Math.PI/2).normalized().scale(this.radius * (1 - (1 / squashAmount)));

    	var position = Graphics.mainCamera.relativePosition(this.position.add(offset));

    	Graphics.canvas.ellipse(position.x, position.y, squashAmount * this.radius, this.radius / squashAmount, squashDirection.direction(), 0, 2*Math.PI);
    	Graphics.canvas.stroke();
    	//Graphics.canvas.fill();
	}

	drawCircle.squash = function (amount, direction) {
		squashAmount = amount;
		squashDirection = direction;
	}

	return drawCircle;
}

Graphics.Star = function (radius, eyes, mouth, rotation, color) {

	// Stars can have faces

	function OpenEyes(radius, rotation, color) {
		var eyeRadius = radius / 5;
		var separation = 2*eyeRadius;
		var offset = 1.5 * eyeRadius;


		var eye1Pos = Vector(-(eyeRadius + separation/2), -offset).rotate(rotation);
		var eye2Pos = Vector(eyeRadius + separation/2, -offset).rotate(rotation);

		var color = color;


		function drawOpenEyes(position) {
			var eye1ScreenPosition = position.add(eye1Pos);
			var eye2ScreenPosition = position.add(eye2Pos);

			Graphics.canvas.strokeStyle=color;
    		
    		Graphics.canvas.beginPath();
    		Graphics.canvas.arc(eye1ScreenPosition.x, eye1ScreenPosition.y, eyeRadius, 0, 2*Math.PI);
    		Graphics.canvas.stroke();

    		Graphics.canvas.beginPath();
    		Graphics.canvas.arc(eye2ScreenPosition.x, eye2ScreenPosition.y, eyeRadius, 0, 2*Math.PI);
    		Graphics.canvas.stroke();
		}

		return drawOpenEyes;
	}

	function SlantedEyes(radius, rotation, color, upSlant) {
		var eyeLength = radius / 2;
		var separation = eyeLength;
		var offset = radius/6;
		var angle = Math.PI/5;

		var eye1 = []
		var eye2 = [];
		if (upSlant) {
			// Move the bottom left corner to the left by cosine of angle so that
			// Top right corner will be spaced right
			eye1[0] = Vector(-separation/2 - eyeLength * Math.cos(angle), -offset);
			eye1[1] = eye1[0].add(Vector.polar(eyeLength, 2 * Math.PI - angle));
		} else {
			eye1[0] = Vector(-separation/2, -offset);
			eye1[1] = eye1[0].add(Vector.polar(eyeLength, Math.PI + angle));
		}

		eye2[0] = Vector(-eye1[0].x, eye1[0].y);
		eye2[1] = Vector(-eye1[1].x, eye1[1].y);

		var rotatedEye1 = Graphics.rotatePoints(eye1, rotation);
		var rotatedEye2 = Graphics.rotatePoints(eye2, rotation);


		function drawSlantedEyes(position) {
			var screenEye1 = Graphics.addToPoints(rotatedEye1, position);
			var screenEye2 = Graphics.addToPoints(rotatedEye2, position);

			Graphics.drawPoints(screenEye1, color);
			Graphics.drawPoints(screenEye2, color);
		}

		return drawSlantedEyes;
	}

	function MMouth(radius, rotation, color) {
		var angle = Math.PI/4;
		var height = radius/3;
		var offset = radius/3;
		var bigSide = height/Math.sin(angle);
		var littleSide = bigSide/2;

		var color = color;

		var points = [];

		points[2] = Vector(0, 0); // Center
		points[1] = points[2].add(Vector.polar(littleSide, 2*Math.PI - angle)); // Upper left vertex
		points[3] = points[2].add(Vector(-points[1].x, points[1].y)); // Upper right vertex
		points[0] = points[1].add(Vector.polar(bigSide, angle)); // Bottom left
		points[4] = points[3].add(Vector.polar(bigSide, Math.PI - angle)); // Bottom right

		// Rotate

		for (var i = 0; i < points.length; i++) {
			points[i] = points[i].add(Vector(0, offset));
			points[i] = points[i].rotate(rotation);
		}

		function drawMMouth(position) {
			var screenPoints = [];
			for (var i = 0; i < points.length; i++) {
				screenPoints[i] = position.add(points[i]);
			}

			Graphics.canvas.strokeStyle=color;
			for (var i = 0; i < screenPoints.length-1; i++) {
				Graphics.canvas.beginPath();
				Graphics.canvas.moveTo(screenPoints[i].x, screenPoints[i].y);
				Graphics.canvas.lineTo(screenPoints[i+1].x, screenPoints[i+1].y);
				Graphics.canvas.stroke();
			}
		}

		return drawMMouth

	}

	function DuckMouth(radius, rotation, color) {
		var width = radius/3.5;
		var height = radius/6.5;
		var xOffset = -radius/8;
		var yOffset = radius/3;
		var length = .5;

		var points = [];
		points[0] = Vector(xOffset, height + yOffset);
		points[1] = Vector(xOffset, -height + yOffset);

		points = Graphics.rotatePoints(points, rotation);

		function drawDuckMouth(position) {
			var relPoints = Graphics.addToPoints(points, position);

			Graphics.canvas.strokeStyle = color;
   		 	Graphics.canvas.beginPath();

    		Graphics.canvas.ellipse(relPoints[0].x, relPoints[0].y, width, height, rotation, Math.PI/2 - length, 3*Math.PI/2);
    		Graphics.canvas.ellipse(relPoints[1].x, relPoints[1].y, width, height, rotation, Math.PI/2, 3*Math.PI/2 + length);
    		Graphics.canvas.stroke();
		}

		return drawDuckMouth;
	}

	var eyeFunction;
	var mouthFunction

	if (eyes == 1) {
		eyeFunction = OpenEyes(radius, rotation, color);
	} else if (eyes == 2) {
		eyeFunction = SlantedEyes(radius, rotation, color);
	} else if (eyes == 3) {
		eyeFunction = SlantedEyes(radius, rotation, color, true);
	}

	if (mouth == 1) {
		mouthFunction = MMouth(radius, rotation, color);
	} else if (mouth == 2) {
		mouthFunction = DuckMouth(radius, rotation, color);
	}

	function drawStar() {
		var position = Graphics.mainCamera.relativePosition(this.position);

		if (eyeFunction) {
			eyeFunction(position);
		}

		if (mouthFunction) {
			mouthFunction(position);
		}

		Graphics.canvas.strokeStyle=color;
    	Graphics.canvas.beginPath();

    	Graphics.canvas.arc(position.x, position.y, this.radius, 0, 2*Math.PI);

    	Graphics.canvas.stroke();
	}

	return drawStar;
}

Graphics.Spike = function(center, polarPosition, dimensions, color) {
	// Uses polar position instead of cartesian position
	var center = center;
	var polarPosition = polarPosition;
	var dimensions = dimensions;

	var point1 = center.add(polarPosition.rotate(-dimensions.x / (2 * polarPosition.magnitude())));
	var point2 = center.add(polarPosition).add(polarPosition.normalized().scale(dimensions.y));
	var point3 = center.add(polarPosition.rotate(dimensions.x / (2 * polarPosition.magnitude())));

	function drawSpike() {
		
		var p1 = Graphics.mainCamera.relativePosition(point1);
		var p2 = Graphics.mainCamera.relativePosition(point2);
		var p3 = Graphics.mainCamera.relativePosition(point3);
		Graphics.canvas.strokeStyle = color;

		Graphics.canvas.beginPath();
		Graphics.canvas.moveTo(p1.x, p1.y);
		Graphics.canvas.lineTo(p2.x, p2.y);
		Graphics.canvas.lineTo(p3.x, p3.y);
		Graphics.canvas.stroke();
	}

	return drawSpike;
}

Graphics.Explosion = function(color) {
	function drawExplosion() {
		Graphics.canvas.strokeStyle=color;
    	

    	var position = Graphics.mainCamera.relativePosition(this.position);

    	var direction = Vector.polar(1, Math.PI/4);

    	// Draws 4 sectors of the circle breaking apart and flying away from each other
    	for (var i = 0; i < 4; i++) {
    		var arcAngle = (Math.PI / 2) * (this.radius / (this.radius + drawExplosion.displacement));
    		var initialAngle = (Math.PI/4 + i*Math.PI/2) - arcAngle/2;
    		var finalAngle = initialAngle + arcAngle;

    		Graphics.canvas.beginPath();
    		Graphics.canvas.arc(position.x, position.y, this.radius + drawExplosion.displacement, initialAngle, finalAngle);
    		Graphics.canvas.stroke();
    	}
	}

	drawExplosion.displacement = 0;

	return drawExplosion;
}

Graphics.Camera = function(dimensions, initialPosition) {
	var camera = {};

	camera.position = initialPosition;
	camera.dimensions = dimensions;

	camera.relativePosition = function (position) {
		return position.add(this.position.scale(-1));
	}

	camera.follow = function (position, margin, speed, dt) {
		// margin is percentage of camera size
		var relativePosition = this.relativePosition(position);

		if (relativePosition.x < margin.x * this.dimensions.x) {
			this.position = this.position.add(Vector(-speed * dt, 0));
		} else if (relativePosition.x > (this.dimensions.x - margin.x * this.dimensions.x)) {
			this.position = this.position.add(Vector(speed * dt, 0));
		}

		if (relativePosition.y < margin.y * this.dimensions.y) {
			this.position = this.position.add(Vector(0, -speed * dt));
		} else if (relativePosition.y > (this.dimensions.y - margin.y * this.dimensions.y)) {
			this.position = this.position.add(Vector(0, speed * dt));
		}		
	}

	camera.inView = function (position) {
		var inX = (position.x >= this.position.x) && (position.x <= (this.position.x + this.dimensions.x));
		var inY = (position.y >= this.position.y) && (position.y <= (this.position.y + this.dimensions.y));
		return inX && inY;
	}

	camera.centerOn = function (position) {
		this.position = position.add(Vector(-this.dimensions.x / 2, -this.dimensions.y / 2));
	}

	this.mainCamera = camera;

	return camera;
}

module.exports = Graphics;
},{"./globals.js":3,"./vector.js":14}],6:[function(require,module,exports){
"use strict"
var Game = require('./game.js');
var Vector = require('./vector.js');

window.onload = function () {
    var canvas = Game.init(Vector(640, 480), 1/60);

    document.getElementsByTagName("body")[0].appendChild(canvas);
}
},{"./game.js":1,"./vector.js":14}],7:[function(require,module,exports){
var Vector = require('./vector.js');

var Input = {};

Input.up = false;
Input.down = false;
Input.left = false;
Input.right = false;

Input.direction = Vector(0,0);

Input.updateDirection = function() {
	if (this.up) {
		this.direction.y = -1;
	} else if (this.down) {
		this.direction.y = 1;
	} else {
		this.direction.y = 0;
	}

	if (this.right) {
		this.direction.x = 1;
	} else if (this.left) {
		this.direction.x = -1;
	} else {
		this.direction.x = 0;
	}

	//console.log(Input.up + ", " + Input.down + ", " + Input.left + ", " + Input.right);
}

Input.mapping = {
	'37': "left",
	'38': "up",
	'39': "right",
	'40': "down"
};

Input.init = function() {
	var self = this;
	document.addEventListener('keydown', function(event) {
		if (Input.mapping[event.keyCode] !== undefined) {
			Input[Input.mapping[event.keyCode]] = true;
		}

		self.updateDirection();
	});

	document.addEventListener('keyup', function(event) {
		if (Input.mapping[event.keyCode] !== undefined) {
			Input[Input.mapping[event.keyCode]] = false;
		}

		self.updateDirection();
	});
}

module.exports = Input;
},{"./vector.js":14}],8:[function(require,module,exports){
var Vector = require('./vector.js');
var Graphics = require('./graphics.js');

var Star = require('./star.js');
var Player = require('./player.js');

var Level = {};

Level.start = function() {
	var a = Star(Vector(100, 150), 125);
	a.draw = Graphics.Star(a.radius, 3, 1, .66, "white");

	Star(Vector(400, 230), 75).addSpike(1.3);
	Star(Vector(200, 435), 75).addSpike(.4);
	Star(Vector(470, 490), 75);
	Star(Vector(740, 485), 75).addSpike(2.9).addSpike(1.1);
	Star(Vector(600, 720), 75).addSpike(4.3).addSpike(.1);

	Star(Vector(865, 715), 75).addOrbiter(100, 3.14, false);

	var b = Star(Vector(900, 1075), 175).coverWithSpikes(Math.PI/3);
	b.draw = Graphics.Star(b.radius, 2, 2, 0, "white");
	Star(Vector(850, 1450), 75).addOrbiter(100, 3.14, true).addOrbiter(100, 0, true);
	Star(Vector(900, 1810), 175).coverWithSpikes(Math.PI/3);

	Star(Vector(1150, 2035), 75);
	Star(Vector(1280, 2115), 35, true);
	var c = Star(Vector(1330, 2250), 75)
	c.draw = Graphics.Star(c.radius, 2, 1, 0, "white");
	Star(Vector(1380, 2115), 35, true);
	Star(Vector(1510, 2035), 75).coverWithSpikes(Math.PI, Math.PI/4);
	Star(Vector(1760, 2035), 75).addOrbiter(100, 3.14, true).addOrbiter(100, 0, true);
	var d = Star(Vector(2020, 2035), 75).addOrbiter(100, Math.PI/2).addOrbiter(100, 3*Math.PI/2);
	d.draw = Graphics.Star(d.radius, 3, 2, 5.5, 'white');

	Star(Vector(2210, 2225), 75);
	Star(Vector(2400, 2415), 75);

	Star(Vector(2590, 2605), 75).addGoal(3/2 * Math.PI).addSpike(0); // The end


	var player = Player(Vector(100, -25));
}

module.exports = Level;
},{"./graphics.js":5,"./player.js":11,"./star.js":13,"./vector.js":14}],9:[function(require,module,exports){
var GameObject = require('./gameobject.js');
var Vector = require('./vector.js');
var Graphics = require('./graphics.js');
var Game = require('./game.js');
var Globals = require('./globals.js');

var speed = 100;
var size = 10;

var Orbiter = function(homeStar, radius, initialAngle, counterClockwise) {
	var angle = initialAngle;
	var star = homeStar
	var clockwise = !counterClockwise;


	var position = star.position.add(Vector.polar(radius, angle));

	var orbiter = GameObject(position, 10, "Orbiter", true);

	orbiter.update = function () {
		if (clockwise) {
			angle -= (speed / radius) * Globals.deltaTime;
		} else {
			angle += (speed / radius) * Globals.deltaTime;
		}
		
		if (angle > 2 * Math.PI) {
			angle -= 2 * Math.PI;
		} else if (angle < 0) {
			angle += 2 * Math.PI;
		}

		this.position = star.position.add(Vector.polar(radius, angle));
	}

	orbiter.draw = Graphics.Circle('red');

	return orbiter;
}

module.exports = Orbiter;
},{"./game.js":1,"./gameobject.js":2,"./globals.js":3,"./graphics.js":5,"./vector.js":14}],10:[function(require,module,exports){
var Physics = {};

Physics.bounce = function (object, collision) {
	var normal = Vector.polar(1, collision.direction);
	var perpindicular = normal.rotate(Math.PI/2);

	var rebased = object.velocity.changeBasis(normal, perpindicular);
	rebased.x = rebased.x * -1 * object.bounce;

	object.velocity = normal.scale(rebased.x).add(perpindicular.scale(rebased.y));
}

// Assumes all objects are circles
Physics.checkCollision = function (obj1, obj2, fuzzy) {
	// fuzzy allows for objects that are within 3 pixels of a collision

	var difference = obj2.position.add(obj1.position.scale(-1));
	var distance = difference.magnitude();

	if (!obj1.radius || !obj2.radius) {
		return false;
	}

	if (obj1.ignoreCollisions || obj2.ignoreCollisions) {
		return false;
	}

	if (!fuzzy && distance > (obj1.radius + obj2.radius)) {
		return false;
	} else if (fuzzy && Math.abs(distance - (obj1.radius + obj2.radius)) > 2) {
		return false;
	}

	var collision = {};
	collision.direction = difference.direction();
	collision.distance = distance;
	collision.overlap = obj1.radius + obj2.radius - distance;

	return collision;
}

Physics.handleCollision = function(obj1, obj2, collision) {
	if (obj1.static) {
		obj2.position = obj2.position.add(Vector.polar(collision.overlap, collision.direction));
		this.bounce(obj2, collision);
	} else if (obj2.static) {
		obj1.position = obj1.position.add(Vector.polar(collision.overlap, collision.direction + Math.PI));
		this.bounce(obj1, collision);
	} else {
		obj1.position = obj1.position.add(Vector.polar(collision.overlap/2, collision.direction + Math.PI));
		obj2.position = obj2.position.add(Vector.polar(collision.overlap/2, collision.direction));

		this.bounce(obj1, collision);
		this.bounce(obj2, collision);
	}

	if (obj1.collide !== undefined) {
		obj1.collide(obj2, collision);
	}

	if (obj2.collide !== undefined) {
		obj2.collide(obj1, collision);
	}
}

Physics.checkAllCollisions = function(objects) {
	for (var i = 0; i < objects.length; i++) {
		for (var j = i+1; j < objects.length; j++) {
			if (objects[i].ignoreCollisions) {
				break;
			}

			if (!objects[j].ignoreCollisions) {
				var collision = this.checkCollision(objects[i], objects[j]);
				if (collision) {
					this.handleCollision(objects[i], objects[j], collision);
				}
			}
		}
	}
}

module.exports = Physics;
},{}],11:[function(require,module,exports){
var Vector = require('./vector.js');
var GameObject = require('./gameobject.js');
var Input = require('./input.js');
var Physics = require('./physics.js');
var Graphics = require('./graphics.js');
var Globals = require('./globals.js');

// Constants that control player motion
var radius = 20;
var upGravity = 470;
var downGravity = 1000;
var maxHorizontalSpeed = 180;
var maxVerticalSpeed = 270;
var groundAcceleration = 140;
var airAcceleration = 110;
var groundTurnaroundAcceleration = 200;
var frictionCoefficient = .7;
var frictionConstant = 10;
var airFrictionMultiplier = 0;
var jumpChargeSpeed = 3;
var maxJumpCharge = 1;
var jumpVelocity = 320;
var squashAmount = .5;

var explosionSpeed = 100;
var deathLength = .7;
var explosionLength = .3;

function Player(position) {
	var initialPosition = position;
	var star;
	var jumpCharge = 0;

	var explodeTimer = 0;
	var deathTimer = 0

	var player = GameObject(position, radius, "Player");


	player.update = function() {
		var stars = GameObject.getTag('Star');
		
		if (deathTimer <= 0 && stars.length > 0) {
			var star = this.closestObject(stars);

			var starDirection = star.position.add(this.position.scale(-1)).normalized();
			var starPerpDirection = starDirection.rotate(-Math.PI/2);

			var onGround = Physics.checkCollision(this, star, true);

			// Gravity
			this.addForce(gravity(this.velocity, starPerpDirection, starDirection));

			// Horizontal movement
			this.addForce(horizontalMotion(this.velocity, starPerpDirection, starDirection, onGround));

			// Friction
			this.addForce(friction(this.velocity, starPerpDirection, starDirection));

			// Jumping
			if (Input.direction.y === 1 && onGround) {

				if (jumpCharge < maxJumpCharge) {
					jumpCharge += jumpChargeSpeed * Globals.deltaTime;
				}
			}	

			if (Input.direction.y !== 1 && jumpCharge > 0) {
				// Actually jump
				var rebasedVel = this.velocity.changeBasis(starDirection, starPerpDirection);
				rebasedVel.x = -jumpCharge * jumpVelocity;
				this.velocity = starDirection.scale(rebasedVel.x).add(starPerpDirection.scale(rebasedVel.y));
			
				jumpCharge = 0;
			}

			// Squash player when charging for a jump
			this.draw.squash((1+(jumpCharge * squashAmount)), starPerpDirection);

		} else if (deathTimer > 0) {
			explode();
		}
	}

	player.collide = function (other) {
		if (other.tag === 'Orbiter' || other.tag === 'Death' || other.tag === 'Spike') {
			if (explodeTimer <= 0) {
				beginExplosion();
			}
		}
	}

	function beginExplosion() {
		explodeTimer = explosionLength;
		deathTimer = deathLength;

		player.ignoreCollisions = true;
		player.draw = Graphics.Explosion('white');
		player.velocity = Vector(0,0);
		player.jumpCharge = 0;

		Globals.timers["Level Timer"].stop();
	} 

	function explode() {
		explodeTimer -= Globals.deltaTime;
		deathTimer -= Globals.deltaTime;

		if (explodeTimer > 0) {
			player.draw.displacement += explosionSpeed * Globals.deltaTime;
		} else if (explodeTimer <= 0) {
			player.draw = undefined;
		}

		if (deathTimer <= 0) {
			die();
		}
	}

	function die() {
		// Reset position
		player.position = initialPosition;
		player.draw = Graphics.Circle('white');
		player.ignoreCollisions = false;

		// Reset time
		Globals.timers["Level Timer"].reset();

		if (!Graphics.mainCamera.inView(player.position)) {
			Graphics.mainCamera.centerOn(player.position);
		}
	}

	player.draw = Graphics.Circle('white');


	return player;
}

// Horizontal and vertical are vectors
function gravity(velocity, horizontal, vertical) {
	var yVel = velocity.changeBasis(horizontal, vertical).y < 0
	if (yVel < -maxVerticalSpeed) {
		return Vector(0,0);
	}
	// Returns a vector representing how much gravity the player is experiencing
	if (yVel < 0) {
		// Player is moving up, use less gravity
		return vertical.scale(upGravity);
	}
	
	return vertical.scale(downGravity);
}

function horizontalMotion(velocity, horizontal, vertical, onGround) {
	if (onGround && Input.direction.y <= 0) {
		// On the ground
		if (velocity.changeBasis(horizontal, vertical).x * Input.direction.x >= 0) {
			if (velocity.magnitude() < maxHorizontalSpeed) {
				return horizontal.scale(groundAcceleration * Input.direction.x);
			} else {
				return friction(velocity, horizontal, vertical);
			}
		} else {
			return horizontal.scale(groundTurnaroundAcceleration * Input.direction.x);
		}
	} else if (!onGround) {
		// In the air
		if (velocity.magnitude() < maxHorizontalSpeed) {
				return horizontal.scale(airAcceleration * Input.direction.x);
		} else {
			return friction(velocity.scale(airFrictionMultiplier), horizontal, vertical);
		}
	}

	return Vector(0,0);
}

function friction(velocity, horizontal, vertical) {
	var frictionForce = Vector(0, 0);

	if (Input.direction.x === 0 || Input.direction.y === 1) {
		var horizontalVelocity = velocity.changeBasis(horizontal, vertical).x;

		var horizontalDirection = 0;
		if (horizontalVelocity != 0) {
			horizontalDirection = horizontalVelocity / Math.abs(horizontalVelocity);
		}
	
		frictionForce = horizontal.scale(horizontalVelocity * -frictionCoefficient);
		frictionForce = frictionForce.add(horizontal.scale(horizontalDirection * -frictionConstant));
	}

	return frictionForce;
}


module.exports = Player;
},{"./gameobject.js":2,"./globals.js":3,"./graphics.js":5,"./input.js":7,"./physics.js":10,"./vector.js":14}],12:[function(require,module,exports){
var GameObject = require('./gameobject.js');
var Graphics = require('./graphics.js');
var Vector = require('./vector.js');


function Spike(homeStar, angle) {
	var star = homeStar


	var position = star.position.add(Vector.polar(star.radius + Spike.height/2, angle));

	var spike = GameObject(position, Spike.width/2, "Spike", true);
	spike.draw = Graphics.Spike(star.position, Vector.polar(star.radius, angle), Vector(Spike.width, Spike.height), 'red');

	return spike;
}

Spike.height = 12;
Spike.width = 12;

module.exports = Spike;
},{"./gameobject.js":2,"./graphics.js":5,"./vector.js":14}],13:[function(require,module,exports){
var Graphics = require('./graphics.js');
var GameObject = require('./gameobject.js');
var Orbiter = require('./orbiter.js');
var Spike = require('./spike.js');
var Goal = require('./goal.js');

function Star (position, radius, deadly) {

	var star;

	if (deadly) {
		star = GameObject(position, radius, "Death", true);
		star.draw = Graphics.Circle('red');
	} else {
		star = GameObject(position, radius, "Star", true);
		//star.draw = Graphics.Star(this.radius, 0, 0, 0, 'white');
		star.draw = Graphics.Circle('white');
	}

	star.addOrbiter = function(radius, initialAngle, counterClockwise) {
		Orbiter(this, radius, initialAngle, counterClockwise);

		return this;
	}

	star.addSpike = function(angle) {
		Spike(this, angle);
		return this;
	}

	star.coverWithSpikes = function(theta, offset) {
		// theta denotes the angle between each spike

		if (!offset) {
			offset = 0;
		}
		for (var i = 0; i < Math.floor(2*Math.PI/theta); i++) {
			var angle = i * theta + offset;
			this.addSpike(angle);
		}

		return this;
	}

	star.addSpikeArc = function(angle, arcAngle) {
		var numberOfSpikes = Math.round((arcAngle * radius)/Spike.width);
		var spikeAngularWidth = arcAngle / numberOfSpikes;

		for (var i = 0; i < numberOfSpikes; i++) {
			Spike(this, (angle - arcAngle/2) + i * spikeAngularWidth);
		}

		return this;
	}

	star.addGoal = function(angle) {
		var goal = Goal(this, angle);
		return this;
	}

	return star;
}

module.exports = Star;
},{"./gameobject.js":2,"./goal.js":4,"./graphics.js":5,"./orbiter.js":9,"./spike.js":12}],14:[function(require,module,exports){
function Vector(x,y) {
	var vector = {};
	vector.x = x;
	vector.y = y;

	function verify(vect) {
		if (isNaN(vect.x)) {
			throw Error("Vector x component is NaN");
		} else if (isNaN(vect.y)) {
			throw Error("Vector y component is NaN");
		}
	}

    vector.round = function (places) {
        if (places == undefined) {
            places = 0;
        }
        var x = Number(Math.round(this.x*Math.pow(10,places))/Math.pow(10,places));
        var y = Number(Math.round(this.y*Math.pow(10,places))/Math.pow(10,places));

        return Vector(x, y);
    }

	vector.equals = function (v) {
        return (this.x === v.x) && (this.y === v.y);
    }

	vector.add = function(v) {
		verify(v);
		verify(this);
		return Vector(this.x + v.x, this.y + v.y);
	};

	vector.scale = function(s) {
		verify(this);
		if (isNaN(s) || s === undefined) {
			throw Error("Must scale by number");
		}
		return Vector(this.x * s, this.y * s);
	}

	vector.dot = function(v) {
		verify(v);
		verify(this);
		return (this.x * v.x) + (this.y * v.y);
	}

	vector.magnitude = function() {
		verify(this);
		return Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2));
	}

	vector.direction = function() {
		verify(this);
		return Math.atan2(this.y, this.x);
	}

	vector.normalized = function() {
		verify(this);
		var mag = this.magnitude();
		if (mag == 0) {
			return this;
		} else {
			return this.scale(1/this.magnitude());
		}
	}

    vector.determinant = function(other) {
    	verify(this);
    	verify(other);
        return this.x * other.y - this.y * other.x;
    }

	vector.changeBasis = function(a, b) {
		verify(this);
		verify(a);
		verify(b);
        if (a.determinant(b) == 0 ) {
            throw Error('Vectors ' + a.toString() + ', and ' + b.toString() + ' linearly dependent');
        }
		var denominator = (a.x * b.y) - (a.y * b.x);
		var x = ((this.x * b.y) - (b.x * this.y))/denominator;
		var y = ((a.x * this.y) - (this.x * a.y))/denominator;

		return Vector(x, y);
	}

	vector.rotate = function(angle) {
		verify(this);
		
		var x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
		var y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
		return Vector(x, y);
	}

    vector.toString = function() {
        return "<" + this.x + ", " + this.y + ">";
    }

	return vector;
}

Vector.polar = function (magnitude, angle) {
	return Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
}

module.exports = Vector;
},{}]},{},[6]);
