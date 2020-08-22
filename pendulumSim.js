const colors = {
	"black": p5.prototype.createVector(0, 0, 0),
	"blue": p5.prototype.createVector(0, 0, 255),
	"red": p5.prototype.createVector(255, 0, 0),
};

const g = 1000;
const realisticG = 9.81;
const timeStep = 1 / 60;


const simpsonsRuleApproximation = (f, a, b, steps=100) => {
	if (a > b) return -simpsonsRuleApproximation(f, b, a, steps);
	if (steps % 2 !== 0) steps++;
	let sum = 0, h = (b-a)/steps;

	for (let j=2; j<=steps; j+=2) {
		sum += f( a + h * (j-2) ) + 4 * f( a + h * (j-1) ) + f( a + h * j );
	}

	return h/3 * sum;
}


class Pendulum {

	constructor(pivotX, pivotY, massDiameter=40, cordLength=150, mass=1, initialTheta=0, cordColor=colors.black, massColor=colors.blue) {
		this.theta = initialTheta - HALF_PI;
		this.theta0 = this.theta;
		this.lastTheta = this.theta;
		this.cordLength = cordLength;
		this.massDiameter = massDiameter;
		this.mass = mass;
		this.cordColor = cordColor;
		this.massColor = massColor;

		this.pivotPos = createVector(pivotX, pivotY);
		this.massPos = p5.Vector.add(this.pivotPos, createVector(sin(this.theta), cos(this.theta)).mult(this.cordLength));
		this.lastPos = this.massPos;
		this.vel = 0;
		this.acc = 0;

		this.factor = -g / this.cordLength;
	}

	getKineticEnergy() {
		const tanVel = this.getTangentialVelocity();
		return 0.5 * this.mass * tanVel * tanVel;
	}

	getPotentialEnergy() {
		return this.mass * g * abs(this.massPos.y - this.pivotPos.y + this.cordLength - this.massDiameter / 2);
	}

	getPeriod() {
		// return TWO_PI * sqrt(this.cordLength / g); / this only works for small angles. in other words it's useless.

		// instead, compute the period using the elliptic integral from here: https://en.wikipedia.org/wiki/Pendulum_(mathematics)#Arbitrary-amplitude_period
		// this is adjusted because here g is not equal to 9.8
		const k = sin(this.theta0 / 2);
		return 4 * sqrt(this.cordLength / g) * simpsonsRuleApproximation((u) => 1 / sqrt(1 - k * k * pow(sin(u), 2)), 0, HALF_PI);
	}

	getMass() {
		return this.mass;
	}

	getTheta() {
		return this.theta;
	}

	getRotationalVelocityAboutPivot() {
		return (this.theta - this.lastTheta) / timeStep;
	}

	getTangentialVelocity() {
		return this.cordLength * this.getRotationalVelocityAboutPivot();
	}

	getCordLength() {
		return this.cordLength;
	}

	setCordLength(cordLength) {
		this.cordLength = cordLength;
		this.setTheta(this.theta+HALF_PI);
	}

	setMass(mass) {
		this.mass = mass;
	}

	setTheta(theta, reset=false) {
		this.theta = theta - HALF_PI;
		this.theta0 = this.theta;
		this.lastTheta = this.theta;
		if (reset) this.vel = 0;
		secondarySurf.background(255);
		this.lastPos = null;
	}

	draw() {
		let radius = this.massDiameter / 2;

		push();
		strokeWeight(2);
		stroke(this.massColor.x, this.massColor.y, this.massColor.z);
		fill(this.massColor.x, this.massColor.y, this.massColor.z);
		if (trace && this.lastPos !== null) {
			secondarySurf.line(this.lastPos.x, this.lastPos.y, this.massPos.x, this.massPos.y);
		}
		this.lastPos = this.massPos; // don't put this under the trace condition
		if (showGuides) {
			dottedLine(this.pivotPos.x, this.pivotPos.y, this.pivotPos.x, this.pivotPos.y + this.cordLength + radius, 20);
			dottedLine(this.pivotPos.x - this.cordLength + radius, this.pivotPos.y + this.cordLength + radius,
					   this.pivotPos.x + this.cordLength + radius, this.pivotPos.y + this.cordLength + radius, 30);
		}
		stroke(this.cordColor.x, this.cordColor.y, this.cordColor.z);
		line(this.pivotPos.x, this.pivotPos.y, this.massPos.x, this.massPos.y);
		circle(this.massPos.x, this.massPos.y, this.massDiameter);

		if (showGuides) {
			fill(this.massColor.x, this.massColor.y, this.massColor.z, 128);
			if (this.theta<0) {
				arc(this.pivotPos.x, this.pivotPos.y, 2*this.massDiameter, 2*this.massDiameter, HALF_PI, -this.theta+HALF_PI);
			} else {
				arc(this.pivotPos.x, this.pivotPos.y, 2*this.massDiameter, 2*this.massDiameter, -this.theta+HALF_PI, HALF_PI);
			}
		}
		pop();
	}

	update() {
		this.lastTheta = this.theta;
		if (!paused) {
			this.acc = this.factor * sin(this.theta);
			this.vel += this.acc * timeStep;
			this.theta = (this.theta + this.vel * timeStep) % TWO_PI;
		}
		this.massPos = p5.Vector.add(this.pivotPos, createVector(sin(this.theta), cos(this.theta)).mult(this.cordLength)); // in case the user clicks
		this.draw();
	}

}


class DoublePendulum {

	constructor(topPivotX, topPivotY, mass1Diameter=40, mass2Diameter=40, cordLength1=75, cordLength2=75, mass1=1, mass2=1, cordColor=colors.black, massColor=colors.blue) {
		this.theta1 = -HALF_PI; this.theta2 = -HALF_PI;
		this.cordLength1 = cordLength1; this.cordLength2 = cordLength2;
		this.mass1Diameter = mass1Diameter; this.mass2Diameter = mass2Diameter;
		this.mass1 = mass1; this.mass2 = mass2;
		this.cordColor = cordColor;
		this.massColor = massColor;

		this.pivotPos = createVector(topPivotX, topPivotY);
		this.mass1Pos = p5.Vector.add(this.pivotPos, createVector(sin(this.theta1), cos(this.theta1)).mult(this.cordLength1));
		this.mass2Pos = p5.Vector.add(this.mass1Pos, createVector(sin(this.theta2), cos(this.theta2)).mult(this.cordLength2));
		this.lastPos = this.mass2Pos;
		this.vel1 = 0, this.vel2 = 0;
		this.acc1 = 0, this.acc2 = 0;

		this.factor = -g / this.cordLength;
	}

	calculateAccelerations() {
		const partialDen = (2 * this.mass1 + this.mass2 - this.mass2 * cos(2 * this.theta1 - 2 * this.theta2));
		this.acc1 = (-g * (2 * this.mass1 + this.mass2) * sin(this.theta1) - this.mass2 * g * sin(this.theta1 - 2 * this.theta2) - 2 * sin(this.theta1 - this.theta2) * this.mass2 * (this.vel2 * this.vel2 * this.cordLength2 + this.vel1 * this.vel1 * this.cordLength1 * cos(this.theta1 - this.theta2))) / (this.cordLength1 * partialDen);
		this.acc2 = (2 * sin(this.theta1 - this.theta2) * (this.vel1 * this.vel1 * this.cordLength1 * (this.mass1 + this.mass2) + g * (this.mass1 + this.mass2) * cos(this.theta1) + this.vel2 * this.vel2 * this.cordLength2 * this.mass2 * cos(this.theta1 - this.theta2))) / (this.cordLength2 * partialDen);
	}

	getKineticEnergy() {
		return 0;
	}

	getPotentialEnergy() {
		return 0;
	}

	getPeriod() {
		return 0;
	}

	getMass1() {
		return this.mass1;
	}

	getMass2() {
		return this.mass2;
	}

	getTheta1() {
		return this.theta1;
	}

	getTheta2() {
		return this.theta2;
	}

	getCordLength1() {
		return this.cordLength1;
	}

	getCordLength2() {
		return this.cordLength2;
	}

	setMass1(mass1) {
		this.mass1 = mass1;
	}

	setMass2(mass2) {
		this.mass2 = mass2;
	}

	setTheta1(theta1, reset=false) {
		this.theta1 = theta1 - HALF_PI;
		if (reset) this.vel1 = 0;
		secondarySurf.background(255);
		this.lastPos = null;
	}

	setTheta2(theta2, reset=false) {
		this.theta2 = theta2 - HALF_PI;
		if (reset) this.vel2 = 0;
		secondarySurf.background(255);
		this.lastPos = null;
	}

	setCordLength1(cordLength1) {
		this.cordLength1 = cordLength1;
		this.setTheta1(this.theta1+HALF_PI);
	}

	setCordLength2(cordLength2) {
		this.cordLength2 = cordLength2;
		this.setTheta1(this.theta1+HALF_PI);
	}

	draw() {
		const radius1 = this.mass1Diameter / 2, radius2 = this.mass2Diameter / 2;

		push();
		strokeWeight(2);
		stroke(this.massColor.x, this.massColor.y, this.massColor.z);
		fill(this.massColor.x, this.massColor.y, this.massColor.z);
		if (trace && this.lastPos !== null) {
			secondarySurf.line(this.lastPos.x, this.lastPos.y, this.mass2Pos.x, this.mass2Pos.y);
		}
		this.lastPos = this.mass2Pos; // don't put this under the trace condition
		if (showGuides) {
			dottedLine(this.pivotPos.x, this.pivotPos.y, this.pivotPos.x, this.pivotPos.y + this.cordLength1 + radius1, 20);
			dottedLine(this.mass1Pos.x, this.mass1Pos.y, this.mass1Pos.x, this.mass1Pos.y + this.cordLength2 + radius2, 20);
			dottedLine(this.pivotPos.x - this.cordLength1 + radius1, this.pivotPos.y + this.cordLength1 + radius1,
					   this.pivotPos.x + this.cordLength1 + radius1, this.pivotPos.y + this.cordLength1 + radius1, 30);
			dottedLine(this.mass1Pos.x - this.cordLength2 + radius2, this.mass1Pos.y + this.cordLength2 + radius2,
					   this.mass1Pos.x + this.cordLength2 + radius2, this.mass1Pos.y + this.cordLength2 + radius2, 30);
		}
		stroke(this.cordColor.x, this.cordColor.y, this.cordColor.z);
		line(this.pivotPos.x, this.pivotPos.y, this.mass1Pos.x, this.mass1Pos.y);
		line(this.mass1Pos.x, this.mass1Pos.y, this.mass2Pos.x, this.mass2Pos.y);
		circle(this.mass1Pos.x, this.mass1Pos.y, this.mass1Diameter);
		circle(this.mass2Pos.x, this.mass2Pos.y, this.mass2Diameter);

		if (showGuides) {
			fill(this.massColor.x, this.massColor.y, this.massColor.z, 128);
			if (this.theta1 < 0) {
				arc(this.pivotPos.x, this.pivotPos.y, 2*this.mass1Diameter, 2*this.mass1Diameter, HALF_PI, -this.theta1+HALF_PI);
			} else {
				arc(this.pivotPos.x, this.pivotPos.y, 2*this.mass1Diameter, 2*this.mass1Diameter, -this.theta1+HALF_PI, HALF_PI);
			}
			if (this.theta2 < 0) {
				arc(this.mass1Pos.x, this.mass1Pos.y, 2*this.mass2Diameter, 2*this.mass2Diameter, HALF_PI, -this.theta2+HALF_PI);
			} else {
				arc(this.mass1Pos.x, this.mass1Pos.y, 2*this.mass2Diameter, 2*this.mass2Diameter, -this.theta2+HALF_PI, HALF_PI);
			}
		}
		pop();
	}

	update() {
		if (!paused) {
			this.calculateAccelerations();
			this.vel1 += this.acc1 * timeStep;
			this.vel2 += this.acc2 * timeStep;
			this.theta1 = (this.theta1 + this.vel1 * timeStep) % TWO_PI;
			this.theta2 = (this.theta2 + this.vel2 * timeStep) % TWO_PI;
		}
		this.mass1Pos = p5.Vector.add(this.pivotPos, createVector(sin(this.theta1), cos(this.theta1)).mult(this.cordLength1));
		this.mass2Pos = p5.Vector.add(this.mass1Pos, createVector(sin(this.theta2), cos(this.theta2)).mult(this.cordLength2)); // in case the user clicks
		this.draw();
	}


}


const dottedLine = (x1, y1, x2, y2, dashes=10) => {
	if (dashes % 2 === 0) dashes++; // make sure it starts and ends with a dash
	let dx = (x2-x1)/dashes, dy = (y2-y1)/dashes;
	for (let i=0; i<dashes; i++) {
		if (i % 2 === 0) {
			line(x1, y1, x1+=dx, y1+=dy);
		} else {
			x1 += dx;
			y1 += dy;
		}
	}
}

const round = (x, decPlaces) => {
	const p = pow(10, decPlaces);
	return floor(x * p) / p;
}

const decimalString = (x, decPlaces=2) => {
	const ending = x<0 ? "" : " ";
	if (x === floor(x)) return (x + ".").padEnd((""+floor(x)).length + decPlaces + 1, "0") + ending;
	return ("" + round(x, decPlaces)).padEnd((""+floor(x)).length + decPlaces + 1, "0") + ending; // +1 because of the decimal point
}

const drawInfo = (paddingX=20, paddingY=20) => {
	let minX = pendulum.pivotPos.x * 2 + paddingX;
	let minY = paddingY + textSize();
	const showString = (label, units, v, inc=true) => {
		const str = label + decimalString(v, 2) + units;
		textSize(floor(min(20, 2 * (width-minX) / (str.length + 1))));
		text(str, minX, minY+=30*inc);
	}
	push();
	fill(0);
	stroke(0);
	strokeWeight(1);
	line(minX - paddingX, 0, minX - paddingX, height);

	showString("Time: ", " seconds", simTime, false);
	if (mode === 0) {
		showString("Kinetic Energy: ", " joules", pendulum.getKineticEnergy());
		showString("Period: ", " seconds", pendulum.getPeriod());
		showString("Mass: ", " kg", pendulum.getMass());
		showString("Theta: ", " radians", pendulum.getTheta());
		showString("Rotational velocity: ", " radians/second", pendulum.getRotationalVelocityAboutPivot());
		showString("Tangential velocity: ", " meters/second", pendulum.getTangentialVelocity());
		showString("String length: ", " meters", pendulum.getCordLength());
	} else {
		showString("Mass 1: ", " kg", pendulum.getMass1());
		showString("Mass 2: ", " kg", pendulum.getMass2());
		showString("Theta 1: ", " radians", pendulum.getTheta1());
		showString("Theta 2: ", " radians", pendulum.getTheta2());
		showString("String 1 length: ", " meters", pendulum.getCordLength1());
		showString("String 2 length: ", " meters", pendulum.getCordLength2());
	}
	pop();

	if (plotWindow.getX() === 0) {
		plotWindow.setCoordinates(minX, minY+=30);
		plotWindow.setPixelDimensions(width - minX - paddingX / 2, height - minY - paddingY / 2);
	}
	handlePlots();
}


function handlePlots() {
	const xData = linearSpace(-1, PI, 25);
	curve1.setData(xData, xData.map(e => sin(e + frameCount / 20)));
	curve2.setData(xData, xData.map(e => cos(e + frameCount / 30)));
	plotWindow.draw();
}


function mousePressed() {
	if (0 <= mouseX) {
		if (mode === 0) {
			const angle = PI-atan2(mouseY - pendulum.pivotPos.y, mouseX - pendulum.pivotPos.x);
			pendulum.setTheta(angle, true);
		} else {
			if (dist(mouseX, mouseY, pendulum.pivotPos.x, pendulum.pivotPos.y) <= pendulum.cordLength1) {
				const angle = PI-atan2(mouseY - pendulum.pivotPos.y, mouseX - pendulum.pivotPos.x);
				pendulum.setTheta1(angle, true);
			} else {
				const angle = PI-atan2(mouseY - pendulum.mass1Pos.y, mouseX - pendulum.mass1Pos.x);
				pendulum.setTheta2(angle, true);
			}
		}
	}
}

function mouseDragged() {
	mousePressed();
}

/* UI stuff */

const togglePause = () => {
	const btn = document.getElementById("pause-btn");
	if (paused) {
		btn.innerHTML = "Pause";
	} else {
		btn.innerHTML = "Resume";
	}
	paused = !paused;
}

const toggleTrace = () => {
	const btn = document.getElementById("trace-btn");
	if (trace) {
		btn.innerHTML = "Enable trace";
		secondarySurf.background(255);
	} else {
		btn.innerHTML = "Disable trace";
	}
	trace = !trace;
}

const toggleGuides = () => {
	const btn = document.getElementById("guides-btn");
	if (showGuides) {
		btn.innerHTML = "Enable guides";
	} else {
		btn.innerHTML = "Disable guides";
	}
	showGuides = !showGuides;
}

const toggleModes = () => {
	const btn = document.getElementById("mode-btn");
	if (mode === 0) {
		btn.innerHTML = "Switch to single pendulum";
		pendulum = new DoublePendulum(width/3, height/5, height/30, height/30, height/6, height/6);
		document.getElementById("single-pendulum-widgets").style.display="none";
		document.getElementById("double-pendulum-widgets").style.display="block";
	} else {
		btn.innerHTML = "Switch to double pendulum";
		pendulum = new Pendulum(width/3, height/5, height/15, height/3);
		document.getElementById("single-pendulum-widgets").style.display="block";
		document.getElementById("double-pendulum-widgets").style.display="none";
	}
	secondarySurf.background(255);
	mode = !mode + 0;
}

const resetSimTime = () => {
	simTime = 0;
}

/* end      */


let pendulum, paused, trace, showGuides, simTime, secondarySurf, mode, plotWindow, plot1, plot2, curve1, curve2;
function setup() {
	canvas = createCanvas(windowWidth * .75, windowHeight);
	canvas.parent("canvas-div");
	secondarySurf = createGraphics(width, height);
	secondarySurf.background(255);
	document.getElementById("gui-div").style.height = windowHeight.toString() + "px";

	/* Physical quantity plots */
	plotWindow = new PlotWindow(0, 0, 1, 1, 1, 2);
	plotWindow.setMargins(0, 5, 5, 5, 5);
	plot1 = plotWindow.setPlot(new Plot2D(), 0, 0);
	plot2 = plotWindow.setPlot(new Plot2D(), 0, 1);
	plot1.setAutoFit(true);
	plot2.setAutoFit(true);

	curve1 = plot1.plot(new Curve2D([-1, 1], [-1, 1]));
	curve2 = plot2.plot(new Curve2D([-1, 1], [-1, 1]));
	curve2.setCurveColor(color(0, 0, 255));
	curve1.setCurveWeight(3);
	curve2.setCurveWeight(3);
	/* end */

	pendulum = new Pendulum(width/3, height/5, height/15, height/3);
	paused = false;
	trace = true;
	showGuides = true;
	mode = 0; // 0: single pendulum. 1: double pendulum
	simTime = 0;
}

function draw() {
	if (!paused) simTime += timeStep;
	image(secondarySurf, 0, 0);
	pendulum.update();
	drawInfo();
}
