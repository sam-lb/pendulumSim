/*
create embeddable plots
Uses p5.js

Written by Sam Brunacini
http://sambrunacini.com/
*/


/*

focus on 2D for now, but make sure there's an easy way to create a 3D plot later when MG3D functionality is added
PlotWindow
	- PlotWindow background color
	- basically update and draw the plots in their correct positions
	- take: pixel dimensions of the entire plotting area, number of plots in x direction, number of plots in y direction. if a plot slot is null, draw nothing there
	- margin AROUND the plots, padding between them
	- like for example with the multiple plots thing: PlotWindow(xplots=a, yplots=b) -> initialize empty (null) a x b grid of plots, then allow PlotWindow.addPlot(new Plot(), (a1, b1))
	  so long as 0 <= a1 <= a and 0 <= b1 <= b and theres not already a plot at (a1, b1). for that make a setPlot(Plot, (a1, b1)).
Plot
	- bounds method, coordinate transformation method, axes, LABELS (for axes and for the plot) all to be overridden
	- background color
	- method: plot() to be overridden
	- DO NOT add to the PlotWindow. this is done manually by the user. Plot should NOT contain a reference to the PlotWindow it is contained by.
	- primitive drawing functions to be overridden
	- method: resize (the entire plotting area.. pixel dimensions). this should not be called by a user.
Plot2D
	- projection mode: rectangular/polar
	- origin position: (%x, %y) from topleft
	- draggableOrigin=true
	- setBounds override
	- primitive drawing override
	- x axis color, y axis color
	- coordinate transformation override
	- drawAxes override (including labels for axes and the entire plot)
	- method: scaleToFitAllData()
	- method: scaleXToFitAllData()
	- method: scaleYToFitAllData()
Plot3D
	- worry about this later
	- add MathGraph3D support here
	- setBounds override
	- primitive drawing override
	- x axis color, y axis color, z axis color, the standard stuff from the MathGraph3D Plot class
	- coordinate transformation override
	- drawAxes override (including labels for axes and the entire plot)
DataPlot2D extends Plot2D
	- method: plot(xData, yData, rescaleToFit=true, color, otherStyleSettingsLater...) -> return a Curve2D object
FunctionPlot2D extends Plot2D
	- method: plot(function, minX=null default to current plot minX, maxX=null default to current plot maxX, rescaleYToFit=true) -> return a Curve2D object
Curve2D
	- addPoint(x, y, sortByX=true)
	- setColor / setOtherStyles...
	- setData(xdata, ydata)
	- setYData(ydata, scaleToFit) -> check if it's the correct length

sam for once in your life make good encapsulated code and document the stuff.
Also at least make some effort to optimize.. this file could become very useful in the future.

*/


class PlotWindow { // PlotWindow is a name already in the global scope. do not rename it to that
	
	/*
	This is the overall manager for the library. The PlotWindow class manages all Plots and handles overall configurations.
	
	@param {int} x: x position of the PlotWindow, in pixels
	@param {int} y: y position of the PlotWindow, in pixels
	@param {int} pixelWidth: The width of the PlotWindow, in pixels
	@param {int} pixelHeight: The height of the PlotWindow, in pixels
	@param {int} plotsX: The number of Plots to allocate space for in the horizontal direction
	@param {int} plotsY: The number of Plots to allocate space for in the vertical direction
	@param {int} margin: The margin between the Plots and the border of the PlotWindow
	@param {int} marginLeft: The margin between the leftmost Plots and the left border of the PlotWindow. Margin will be max(marginLeft, margin).
	@param {int} marginRight: The margin between the rightmost Plots and the right border of the PlotWindow. Margin will be max(marginRight, margin).
	@param {int} marginTop: The margin between the topmost Plots and the top border of the PlotWindow. Margin will be max(marginTop, margin).
	@param {int} marginBottom: The margin between the bottommost Plots and the bottom border of the PlotWindow. Margin will be max(marginBottom, margin).
	@param {int} horizontalPadding: The total padding BETWEEN (not on the outermost borders of the Plots on the edge) in the horizontal direction.
	@param {int} verticalPadding: The total padding BETWEEN (not on the outermost borders of the Plots on the edge) in the vertical direction.
	@param {p5 color object} backgroundColor: The PlotWindow's background color.
	*/
	constructor(x, y, pixelWidth=400, pixelHeight=400, plotsX=1, plotsY=1, margin=10, marginLeft=10, marginRight=10, marginTop=10, marginBottom=10,
				horizontalPadding=5, verticalPadding=5, backgroundColor=color(0, 0, 0)) {
		this.config = {
			general: {},
			style: {},
		};
		this.setPlotsX(plotsX);
		this.setPlotsY(plotsY);
		this.setX(x);
		this.setY(y);
		this.generatePlotGrid();
		
		this.setPixelDimensions(pixelWidth, pixelHeight, false);
		this.setMargin(margin, false);
		this.setMarginLeft(marginLeft, false);
		this.setMarginRight(marginRight, false);
		this.setMarginTop(marginTop, false);
		this.setMarginBottom(marginBottom, false);
		this.setHorizontalPadding(horizontalPadding, false);
		this.setVerticalPadding(verticalPadding);
		this.setBackgroundColor(backgroundColor);
	}
	
	getPixelWidth() {
		return this.config.general.pixelWidth;
	}
	
	getPixelHeight() {
		return this.config.general.pixelHeight;
	}
	
	getPlotsX() {
		return this.config.general.plotsX;
	}
	
	getPlotsY() {
		return this.config.general.plotsY;
	}
	
	getX() {
		return this.config.general.x;
	}
	
	getY() {
		return this.config.general.y;
	}
	
	getMargin() {
		return this.config.style.margin;
	}
	
	getMarginLeft() {
		return this.config.style.marginLeft;
	}
	
	getMarginRight() {
		return this.config.style.marginRight;
	}
	
	getMarginTop() {
		return this.config.style.marginTop;
	}
	
	getMarginBottom() {
		return this.config.style.marginBottom;
	}
	
	getHorizontalPadding() {
		return this.config.style.horizontalPadding;
	}
	
	getVerticalPadding() {
		return this.config.style.verticalPadding;
	}
	
	getTotalHorizontalPadding() {
		return this.getHorizontalPadding() * (this.getPlotsX() - 1);
	}
	
	getTotalVerticalPadding() {
		return this.getVerticalPadding() * (this.getPlotsY() - 1);
	}
	
	getPlotWidth() {
		return this.config.general.plotWidth;
	}
	
	getPlotHeight() {
		return this.config.general.plotHeight;
	}
	
	getPlot(a, b) {
		return this.plotGrid[a][b];
	}
	
	getBackgroundColor() {
		return this.config.style.backgroundColor;
	}
	
	setPixelWidth(pixelWidth, resize=true) {
		// reset the PlotWindow here... this.surface = createGraphics(pixelWidth, pixelHeight)
		if (pixelWidth <= 0) {
			throw new Error("pixelWidth cannot be less than or equal to zero.");
		} else if (pixelWidth <= width) {
			this.config.general.pixelWidth = pixelWidth;
			if (resize) {
				this.surface = createGraphics(pixelWidth, this.getPixelHeight());
				this.calculateAllPlotDimensions();
			}
		} else {
			throw new Error("pixelWidth should be less than the parent canvas width.");
		}
	}
	
	setPixelHeight(pixelHeight, resize=true) {
		if (pixelHeight <= 0) {
			throw new Error("pixelHeight cannot be less than or equal to zero.");
		} else if (pixelHeight <= height) {
			this.config.general.pixelHeight = pixelHeight;
			if (resize) {
				this.calculatePlotWindowAndPlotDimensions();
			}
		} else {
			throw new Error("pixelHeight should be less than the parent canvas height.");
		}
	}
	
	/* Set both pixelHeight and pixelWidth at once */
	setPixelDimensions(pixelWidth, pixelHeight, resize=true) {
		this.setPixelWidth(pixelWidth, false);
		this.setPixelHeight(pixelHeight, resize);
	}
	
	setPlotsX(plotsX) {
		this.config.general.plotsX = plotsX;
	}
	
	setPlotsY(plotsY) {
		this.config.general.plotsY = plotsY;
	}
	
	setX(x) {
		this.config.general.x = x;
	}
	
	setY(y) {
		this.config.general.y = y;
	}
	
	/* Set both x and y coordinates */
	setCoordinates(x, y) {
		this.setX(x);
		this.setY(y);
	}
	
	/* Set both plotsX and plotsY at once */
	setPlotDimensionGrid(plotsX, plotsY) {
		this.setPlotsX(plotsX);
		this.setPlotsY(plotsY);
	}
	
	setMargin(margin, check=false) {
		if ((margin * 2 + this.getTotalHorizontalPadding() >= this.getPixelWidth) ||
			(margin * 2 + this.getTotalVerticalPadding() >= this.getPixelHeight)) {
			throw new Error("Margins and padding cannot exceed the total pixel dimensions of the PlotWindow.");
		} else {
			this.config.style.margin = margin;
			if (check) {
				this.setMarginLeft(this.getMarginLeft(), false);
				this.setMarginRight(this.getMarginRight(), false);
				this.setMarginTop(this.getMarginTop(), false);
				this.setMarginBottom(this.getMarginBottom(), true);
			}
		}
	}
	
	setMarginLeft(marginLeft, resize=true) {
		this.config.style.marginLeft = max(this.getMargin(), marginLeft);
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	setMarginRight(marginRight, resize=true) {
		this.config.style.marginRight = max(this.getMargin(), marginRight);
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	setMarginTop(marginTop, resize=true) {
		this.config.style.marginTop = max(this.getMargin(), marginTop);
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	setMarginBottom(marginBottom, resize=true) {
		this.config.style.marginBottom = max(this.getMargin(), marginBottom);
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	setHorizontalPadding(horizontalPadding, resize=true) {
		this.config.style.horizontalPadding = horizontalPadding;
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	setVerticalPadding(verticalPadding, resize=true) {
		this.config.style.verticalPadding = verticalPadding;
		if (resize) this.calculatePlotWindowAndPlotDimensions();
	}
	
	/* this should not be called by users */
	setPlotWidth(plotWidth) {
		this.config.general.plotWidth = plotWidth;
	}
	
	 /* this should not be called by users */
	setPlotHeight(plotHeight) {
		this.config.general.plotHeight = plotHeight;
	}
	
	/*
	set the Plot at (a, b) to the plot
	@param {Plot or subclass} plot
	@param {int} a: the column of the target position
	@param {int} b: the row of the target position
	@return {plot}: the plot that was passed in
	*/
	setPlot(plot, a, b) {
		if (0 <= a && a <= this.getPlotsX() + 1 && 0 <= b && b <= this.getPlotsY() + 1) {
			if (plot instanceof Plot) {
				this.plotGrid[a][b] = plot;
				plot.setDimensions(this.getPlotWidth(), this.getPlotHeight());
				return plot;
			} else {
				throw new Error("plot must be a Plot or subclass.");
			}
		} else {
			throw new Error("a must be in range [0, plotsX] and b must be in the range [0, plotsY).");
		}
	}
	
	setBackgroundColor(backgroundColor) {
		this.config.style.backgroundColor = backgroundColor;
	}
	
	/* Determine the width and height of all Plots in the PlotWindow. Resize the Plots accordingly. */
	calculatePlotWindowAndPlotDimensions() {
		this.surface = createGraphics(this.getPixelWidth(), this.getPixelHeight());
		this.setPlotWidth((this.getPixelWidth() - this.getMarginLeft() - this.getMarginRight() - this.getTotalHorizontalPadding()) / this.getPlotsX());
		this.setPlotHeight((this.getPixelHeight() - this.getMarginTop() - this.getMarginBottom() - this.getTotalVerticalPadding()) / this.getPlotsY());
		for (let row of this.plotGrid) {
			for (let plot of row) {
				if (plot !== null) plot.setDimensions(this.getPlotWidth(), this.getPlotHeight());
			}
		}
	}
	
	generatePlotGrid() {
		this.plotGrid = [];
		let row = [];
		for (let y=0; y<this.getPlotsY(); y++) {
			row = [];
			for (let x=0; x<this.getPlotsX(); x++) {
				row.push(null);
			}
			this.plotGrid.push(row.slice());
		}
	}
	
	/* Calculate the pixel position of the plot at row a and column b */
	calculatePlotPosition(a, b) {
		return createVector(this.getMarginLeft() + a * (this.getPlotWidth() + this.getHorizontalPadding()),
							this.getMarginTop() + b * (this.getPlotHeight() + this.getVerticalPadding()));
	}
	
	/* Draw all Plots */
	draw() {
		this.surface.background(this.getBackgroundColor());
		
		let row = [], plot, pos;
		for (let a=0; a<this.plotGrid.length; a++) {
			row = this.plotGrid[a];
			for (let b=0; b<row.length; b++){
				plot = row[b];
				if (plot !== null) {
					pos = this.calculatePlotPosition(a, b);
					plot.update();
					this.surface.image(plot.surface, pos.x, pos.y);
				}
			}
		}
		
		image(this.surface, this.getX(), this.getY());
	}
	
	/*
	Save an image of the current PlotWindow view.
	@param {string} filename: The name of the save file
	*/
	save(filename) {
		// probably use p5.js saveCanvas() / saveImage()
	}
	
}


Plot
	- bounds method, coordinate transformation method, axes, LABELS (for axes and for the plot) all to be overridden
	- background color
	- method: plot() to be overridden
	- DO NOT add to the PlotWindow. this is done manually by the user. Plot should NOT contain a reference to the PlotWindow it is contained by.
	- primitive drawing functions to be overridden
	- method: resize (the entire plotting area.. pixel dimensions). this should not be called by a user.


class Plot {
	
	/*
	The Plot class is the base class for all plotting areas, or, the areas where all the plotting is done
	
	@param {p5 color object}: backgroundColor
	*/
	
	constructor(backgroundColor=color(255, 255, 255)) {
		this.config = {
			general: {},
			style: {},
		}
		this.hasDimensionsSet = false;
		this.setBackgroundColor(backgroundColor);
	}
	
	getPixelWidth() {
		return this.config.general.pixelWidth;
	}
	
	getPixelHeight() {
		return this.config.general.pixelHeight;
	}
	
	getBackgroundColor() {
		return this.config.style.backgroundColor;
	}
	
	setPixelWidth(pixelWidth) {
		this.config.general.pixelWidth = pixelWidth;
	}
	
	setPixelHeight(pixelHeight) {
		this.config.general.pixelHeight = pixelHeight;
	}
	
	setDimensions(pixelWidth, pixelHeight) {
		this.hasDimensionsSet = true;
		this.setPixelWidth(pixelWidth);
		this.setPixelHeight(pixelHeight);
		this.surface = createGraphics(this.getPixelWidth(), this.getPixelHeight());
	}
	
	setBackgroundColor(backgroundColor) {
		this.config.style.backgroundColor = backgroundColor;
		this.needsUpdate = true;
	}
	
	/* Determine the new bounds of the Plot. To be overridden by subclasses. */
	calculateBounds() {
		
	}
	
	/*
	Transform the coordinates to match the Plot's coordinate system. to be overridden by subclasses
	@param {p5.Vector} point: the point to transform.
	@returns {p5.Vector} the transformed point.
	*/
	coordinateTransform(point) {
		
	}
	
	/* update and draw the plot. to be overridden by subclasses */
	updateState() {
		this.surface.background(this.getBackgroundColor());
	}
	
	/* check if the Plot should be updated. if so, call this.updateState() */
	update() {
		/*  */
		if (this.hasDimensionsSet && this.needsUpdate) {
			this.updateState():
		}
		this.needsUpdate = false;
	}
	
}


class Plot2D extends Plot {
	
	/*
	The base class for all types of 2D Plots.
	*/
	
}


class Plot3D extends Plot {
	
	/*
	The base class for all types of 3D plots.
	*/
	
}


class DataPlot2D extends Plot2D {
	
	/*
	A Plot that is created from discrete x and y data
	*/
	
}


class ContinuousUpdateDataPlot2D extends DataPlot2D {
	
	/*
	DataPlot2D that constantly drops data off the back and takes new data at the front, retaining a certain number of data points
	*/
	
}


class FunctionPlot2D extends Plot2D {
	
	/*
	A Plot that generates data based on a 1 dimensional function
	*/
	
}






//\ ------------------------------------------------------------------------------------------------------------------ /\\

let win;
function setup() {
	canvas = createCanvas(windowWidth, windowHeight);
	canvas.parent("canvas-div");
	
	//win = new PlotWindow(0, 0, 400, 400, 2, 2);
	//win.setPlot(new Plot(), 0, 0);
}

function draw() {
	//win.draw();
}