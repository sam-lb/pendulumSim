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


/*
Generate an evenly array of number data
@param {number} start: lower bound on the data values
@param {number} stop: upper bound on the data values
@param {number} n: number of data values to have
*/
function linearSpace(start, stop, n=100) {
	const step = (stop - start) / (n - 1);
	const result = [];
	for (let i=0; i<=n; i++) {
		result.push(start);
		start += step;
	}
	return result;
}


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

	/* set all margins at once */
	setMargins(overall, left, right, top, bottom) {
		this.setMargin(overall);
		this.setMarginLeft(left);
		this.setMarginRight(right);
		this.setMarginTop(top);
		this.setMarginBottom(bottom)
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
			throw new Error("a must be in range [0, plotsX) and b must be in the range [0, plotsY).");
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


class Plot {

	/*
	The Plot class is the base class for all plotting areas, or, the areas where all the plotting is done

	@param {string} titleLabel: the label at the top of the Plot. if null, no title is used.
	@param {p5 color object} titleLabelColor: The color of the title label
	@param {int} titleLabelSize: text size of title label
	@param {p5 color object} backgroundColor: the Plot's background color
	*/

	constructor(titleLabel=null, titleLabelColor=color(0, 0, 0), titleLabelSize=20, backgroundColor=color(255, 255, 255)) {
		this.config = {
			general: {},
			style: {},
		};
		this.labels = {};

		this.hasDimensionsSet = false;
		this.setTitleLabel(titleLabel, titleLabelColor, titleLabelSize);
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

	getTitleLabel() {
		return this.labels.titleLabel;
	}

	getLabels() {
		return this.labels;
	}

	/* This method should not be called by a user. */
	setPixelWidth(pixelWidth) {
		this.config.general.pixelWidth = pixelWidth;
		this.needsUpdate = true;
	}

	/* This method should not be called by a user. */
	setPixelHeight(pixelHeight) {
		this.config.general.pixelHeight = pixelHeight;
		this.needsUpdate = true;
	}

	/* This method should not be called by a user. */
	setDimensions(pixelWidth, pixelHeight) {
		this.hasDimensionsSet = true;
		this.setPixelWidth(pixelWidth);
		this.setPixelHeight(pixelHeight);
		this.surface = createGraphics(this.getPixelWidth(), this.getPixelHeight());
		this.onDimensionSet();
		this.needsUpdate = true;
	}

	/* to be overridden */
	onDimensionSet() {

	}

	setTitleLabel(titleLabel, titleLabelColor, titleLabelSize) {
		this.labels.titleLabel = this.generateLabel(titleLabel, titleLabelColor, titleLabelSize);
	}

	setBackgroundColor(backgroundColor) {
		this.config.style.backgroundColor = backgroundColor;
		this.needsUpdate = true;
	}

	/*
	Generate a label JS object
	@param {string} labelText: the text of the label
	@param {p5 color object} labelColor: the color of the label
	@param {int} labelSize: the text size of the label
	@param {string} labelOrientation: the orientation of the label. either "horizontal" or "vertical"
	*/
	generateLabel(labelText, labelColor, labelSize, labelOrientation="horizontal") {
		return {
			labelText: labelText,
			labelColor: labelColor,
			labelSize: labelSize,
			labelOrientation: labelOrientation,
		};
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

	/*
	Draw a line to the Plot's surface. Does not handle styling.
	@param {p5.Vector} A: The starting point of the line
	@param {p5.Vector} B: the ending point of the line
	*/
	drawLine(A, B) {
		A = this.coordinateTransform(A);
		B = this.coordinateTransform(B);
		this.surface.line(A.x, A.y, B.x, B.y);
	}

	/* update and draw the plot. to be overridden by subclasses */
	updateState() {
		this.surface.background(this.getBackgroundColor());
	}

	/* check if the Plot should be updated. if so, call this.updateState() */
	update() {
		/*  */
		if (this.hasDimensionsSet && this.needsUpdate) {
			this.updateState();
		}
		this.needsUpdate = false;
	}

}


class Plot2D extends Plot {

	/*
	The base class for all types of 2D Plots.

	@param {float} originX: The origin's pixel x coordinate as a proportion (in the interval [0, 1]) of the total width
	@param {float} originY: The origin's pixel y coordinate as a proportion (in the interval [0, 1]) of the total height
	@param {number} minX: lower bound of x to show on the Plot. Must be less than maxX
	@param {number} maxX: upper bound of x to show on the Plot. Must be greater than minX
	@param {number} minY: lower bound of y to show on the Plot. Must be less than maxY
	@param {number} maxY: upper bound of y to show on the Plot. Must be greater than maxY
	@param {bool} draggableOrigin: Allow the origin to be dragged with the mouse
	@param {p5 color object} xAxisColor: the color of the x axis
	@param {p5 color object} yAxisColor: the color of the y axis
	@param {bool} axesEnabled: show the axes on the Plot
	@param {bool} ticksEnabled: show tick lines on the axes
	@param {bool} lineNumbersEnabled: show line numbers on the axes
	@param {bool} gridLinesEnabled: show the minor gridlines
	@param {string} xLabel: the label to use for the x axis. if null, no label is given to the axis.
	@param {p5 color object} xLabelColor: the color of the x axis label
	@param {int} text size of the x axis label
	@param {string} yLabel: the label to use for the y axis. if null, no label is given to the axis.
	@param {p5 color object} yLabelColor: the color of the y axis label
	@param {int} text size of the y axis label
	@param {string} titleLabel: the label at the top of the Plot. if null, no title is used.
	@param {p5 color object} titleLabelColor: The color of the title label
	@param {int} titleLabelSize: text size of title label
	@param {p5 color object} backgroundColor: the Plot's background color
	@param {string} xScaling: the scale to use on the x axis. can be "linear" or "logarithmic"
	@param {string} yScaling: the scale to use on the y axis. can be "linear" or "logarithmic"
	@param {number} xLogBase: the log base to use in logarithmic scale mode on the x axis
	@param {number} yLogBase: the log base to use in logarithmic scale mode on the y axis
	@param {string} projectionMode: The type of coordinate projection to use. Can be "rectangular" or "polar".
	*/
	constructor(originX=0.5, originY=0.5, minX=-1, maxX=1, minY=-1, maxY=1, draggableOrigin=true,
		xAxisColor=color(0, 0, 0), yAxisColor=color(0, 0, 0), axesEnabled=true, ticksEnabled=true, lineNumbersEnabled=true,
		gridLinesEnabled=false, xLabel=null, xLabelColor=color(0, 0, 0), xLabelSize=10, yLabel=null, yLabelColor=color(0, 0, 0),
		yLabelSize=10, titleLabel=null, titleLabelColor=color(0, 0, 0), titleLabelSize=20, backgroundColor=color(255, 255, 255),
		xScaling="linear", yScaling="linear", xLogBase=null, yLogBase=null, projectionMode="rectangular") {

		super(titleLabel, titleLabelColor, titleLabelSize, backgroundColor);
		this.curveArray = [];
		this.setDraggableOrigin(draggableOrigin);
		this.setXAxisColor(xAxisColor);
		this.setYAxisColor(yAxisColor);

		this.setAxesEnabled(axesEnabled);
		this.setTicksEnabled(ticksEnabled);
		this.setLineNumbersEnabled(lineNumbersEnabled);
		this.setGridLinesEnabled(gridLinesEnabled);

		this.setXAxisLabel(xLabel, xLabelColor, xLabelSize);
		this.setYAxisLabel(yLabel, yLabelColor, yLabelSize);

		this.setXScaling(xScaling);
		this.setYScaling(yScaling);
		this.setXLogBase(xLogBase);
		this.setYLogBase(yLogBase);
		this.setProjectionMode(projectionMode);

		this.setOrigin(originX, originY);
		this.calculateBounds(minX, maxX, minY, maxY);
	}

	getOriginX() {
		return this.config.general.originX;
	}

	getOriginY() {
		return this.config.general.originY;
	}

	getOriginPixelX() {
		return this.config.general.originPixelX;
	}

	getOriginPixelY() {
		return this.config.general.originPixelY;
	}

	getXMin() {
		return this.config.general.xMin;
	}

	getXMax() {
		return this.config.general.xMax;
	}

	getYMin() {
		return this.config.general.yMin;
	}

	getYMax() {
		return this.config.general.yMax;
	}

	/* Return [xMin, xMax] */
	getXBounds() {
		return [this.getXMin(), this.getXMax()];
	}

	/* Return [yMin, yMax] */
	getYBounds() {
		return [this.getYMin(), this.getYMax()];
	}

	/* Return [xMin, xMax, yMin, yMax] */
	getBounds() {
		return [this.getXMin(), this.getXMax(), this.getYMin(), this.getYMax()];
	}

	getXUnits() {
		return this.config.general.xUnits;
	}

	getYUnits() {
		return this.config.general.yUnits;
	}

	getDraggableOrigin() {
		return this.config.general.draggableOrigin;
	}

	getXAxisColor() {
		return this.config.style.xAxisColor;
	}

	getYAxisColor() {
		return this.config.style.yAxisColor;
	}

	getAxesEnabled() {
		return this.config.general.axesEnabled;
	}

	getTicksEnabled() {
		return this.config.general.ticksEnabled;
	}

	getLineNumbersEnabled() {
		return this.config.general.lineNumbersEnabled;
	}

	getGridLinesEnabled() {
		return this.config.general.gridLinesEnabled;
	}

	getXAxisLabel() {
		return this.labels.xAxis;
	}

	getYAxisLabel() {
		return this.labels.yAxis;
	}

	getXScaling() {
		return this.config.general.xScaling;
	}

	getYScaling() {
		return this.config.general.yScaling;
	}

	getXLogBase() {
		return this.config.general.xLogBase;
	}

	getYLogBase() {
		return this.config.general.yLogBase;
	}

	getProjectionMode() {
		return this.config.general.projectionMode;
	}

	getXScale() {
		return this.config.general.xScale;
	}

	getYScale() {
		return this.config.general.yScale;
	}

	getCurveArray() {
		return this.curveArray();
	}

	onDimensionSet() {
		this.hasDimensionsSet = true;
		this.setOrigin(this.getOriginX(), this.getOriginY());
		this.calculateBounds(this.getXMin(), this.getXMax(), this.getYMin(), this.getYMax());
	}

	setOrigin(originX, originY) {
		if (!(0 <= originX && originX <= 1 && 0 <= originY && originY <= 1)) throw new Error("Origin proportions must be on the interval [0, 1].");
		this.config.general.originX = originX;
		this.config.general.originY = originY;

		if (this.hasDimensionsSet) {
			this.config.general.originPixelX = this.getOriginX() * this.getPixelWidth();
			this.config.general.originPixelY = this.getOriginY() * this.getPixelHeight();
		}

		this.needsUpdate = true;
	}

	/* There is no way to set the x or y bounds individually. */
	calculateBounds(xMin, xMax, yMin, yMax) {
		if (xMin >= xMax || yMin >= yMax) throw new Error("xMin must be less than xMax and yMin must be less than yMax.");
		this.config.general.xMin = xMin;
		this.config.general.xMax = xMax;
		this.config.general.yMin = yMin;
		this.config.general.yMax = yMax;
		this.config.general.xUnits = xMax - xMin;
		this.config.general.yUnits = yMax - yMin;

		if (this.hasDimensionsSet) {
			this.config.general.xScale = this.getPixelWidth() / this.getXUnits();
			this.config.general.yScale = this.getPixelHeight() / this.getYUnits();
		}

		this.needsUpdate = true;
	}

	setDraggableOrigin(draggableOrigin) {
		this.config.general.draggableOrigin = draggableOrigin;
	}

	setXAxisColor(xAxisColor) {
		this.config.style.xAxisColor = xAxisColor;
		this.needsUpdate = true;
	}

	setYAxisColor(yAxisColor) {
		this.config.style.yAxisColor = yAxisColor;
		this.needsUpdate = true;
	}

	setAxesEnabled(axesEnabled) {
		this.config.general.axesEnabled = axesEnabled;
		this.needsUpdate = true;
	}

	setTicksEnabled(ticksEnabled) {
		this.config.general.ticksEnabled = ticksEnabled;
		this.needsUpdate = true;
	}

	setLineNumbersEnabled(lineNumbersEnabled) {
		this.config.general.lineNumbersEnabled = lineNumbersEnabled;
		this.needsUpdate = true;
	}

	setGridLinesEnabled(gridLinesEnabled) {
		this.config.general.gridLinesEnabled = gridLinesEnabled;
		this.needsUpdate = true;
	}

	setXAxisLabel(xAxisLabel, xLabelColor, xLabelSize) {
		this.labels.xAxis = this.generateLabel(xAxisLabel, xLabelColor, xLabelSize, "horizontal");
		this.needsUpdate = true;
	}

	setYAxisLabel(yAxisLabel, yLabelColor, yLabelSize) {
		this.labels.yAxis = this.generateLabel(yAxisLabel, yLabelColor, yLabelSize, "vertical");
		this.needsUpdate = true;
	}

	setXScaling(xScaling) {
		this.config.general.xScaling = xScaling;
		this.needsUpdate = true;
	}

	setYScaling(yScaling) {
		this.config.general.yScaling = yScaling;
		this.needsUpdate = true;
	}

	setXLogBase(xLogBase) {
		this.config.general.xLogBase = xLogBase;
		this.needsUpdate = true;
	}

	setYLogBase(yLogBase) {
		this.config.general.yLogBase = yLogBase;
		this.needsUpdate = true;
	}

	setProjectionMode(projectionMode) {
		if (projectionMode === "rectangular" || projectionMode === "polar") {
			this.config.general.projectionMode = projectionMode;
		} else {
			throw new Error("Projection mode must be 'rectangular' or 'polar', not " + projectionMode);
		}
	}

	/*
	Add a Curve object (or subclass) to the CurveArray
	@param {Curve} curve: the Curve to be added
	@returns {Curve}: the same curve that was passed in
	*/
	addCurve(curve) {
		if (curve instanceof Curve) {
			this.curves.push(curve);
			this.needsUpdate = true;
			return curve;
		}
		throw new Error("curve must be an instance of Curve or subclass.");
	}

	/* Transform a point in 2D rectangular or polar space to canvas space */
	coordinateTransform(point) {
		let x, y;

		if (this.getProjectionMode() === "rectangular") {
			x = point.x;
			y = point.y;
		} else {
			x = point.x * cos(point.y);
			y = point.x * sin(point.y);
		}

		return createVector(
			this.getOriginPixelX() + x * this.getXScale(),
			this.getOriginPixelY() - y * this.getYScale(),
		);
	}

	/*
	Transform the coordinates from canvas space to 2D plane space.
	@param {p5.Vector} point: the point to transform.
	@returns {p5.Vector} the transformed point.
	*/
	reverseTransform(point) {
		return createVector((point.x - this.getOriginPixelX()) / this.getXScale(),
							(this.getOriginPixelY() - point.y) / this.getYScale());
	}

	/* Resize the x bounds of the Plot to fit all data */
	scaleXToFitAllData() {
		if (this.curveArray.length !== 0) {
			let xMin = Infinity, xMax = -Infinity, lmin, lmax;
			for (let curve of this.curveArray) {
				lmin = curve.getXMin();
				lmax = curve.getXMax();
				if (lmin < xMin) xMin = lmin;
				if (lmax > xMax) xMax = lmax;
			}
			if (xMin !== xMax) this.calculateBounds(xMin*1.1, xMax*1.1, this.getYMin(), this.getYMax());
		}
		this.needsUpdate = true;
	}

	/* Resize the y bounds of the Plot to fit all data */
	scaleYToFitAllData() {
		if (this.curveArray.length !== 0) {
			let yMin = Infinity, yMax = -Infinity, lmin, lmax;
			for (let curve of this.curveArray) {
				lmin = curve.getYMin();
				lmax = curve.getYMax();
				if (lmin < yMin) yMin = lmin;
				if (lmax > yMax) yMax = lmax;
			}
			if (yMin !== yMax) this.calculateBounds(this.getXMin(), this.getXMax(), yMin*1.1, yMax*1.1);
		}
		this.needsUpdate = true;
	}

	/* Resize the Plot bounds to fit all data */
	scaleToFitAllData() {
		this.scaleXToFitAllData();
		this.scaleYToFitAllData();
	}

	/* Resize the Plot's x bounds to fit a curve */
	scaleXToFitCurve(curve) {
		const xMin = curve.getMinX(), xMax = curve.getMaxX();
		if (xMin !== xMax) {
			this.calculateBounds(xMin * 1.1, xMax * 1.1, this.getYMin(), this.getYMax());
		}
		this.needsUpdate = true;
	}

	/* Resize the Plot's y bounds to fit a curve */
	scaleYToFitCurve(curve) {
		const yMin = curve.getMinY(), yMax = curve.getMaxY();
		if (yMin !== yMax) {
			this.calculateBounds(this.getXMin(), this.getXMax(), yMin * 1.1, yMax * 1.1);
		}
		this.needsUpdate = true;
	}

	/* Resize the Plot's bounds to fit a curve */
	scaleToFitCurve(curve) {
		this.scaleXToFitCurve(curve);
		this.scaleYToFitCurve(curve);
	}

	/*
	Add a curve to the Plot
	@param {Curve2D} curve: the curve to be added
	@param {bool} resize: resize the Plot's bounds after adding the new Curve
	@returns {Curve2D}: the curve that was added
	*/
	plot(curve, resize=true) {
		if (!(curve instanceof Curve2D)) throw new Error("curve argument must be a Curve2D.");
		this.curveArray.push(curve);
		if (resize) this.scaleToFitAllData();
		return curve;
	}

	/* Draw the axes */
	drawAxes() {
		// labels should be drawn here too.
		push();
		this.surface.strokeWeight(1);
		if (this.getYMin() <= 0 && this.getYMax() >= 0) {
			this.surface.stroke(this.getXAxisColor());
			this.drawLine(createVector(this.getXMin(), 0), createVector(this.getXMax(), 0));
		}
		if (this.getXMin() <= 0 && this.getXMax() >= 0) {
			this.surface.stroke(this.getYAxisColor());
			this.drawLine(createVector(0, this.getYMin()), createVector(0, this.getYMax()));
		}
		pop();
	}

	updateState() {
		this.surface.background(this.getBackgroundColor());
		if (this.getAxesEnabled()) this.drawAxes();

		for (let curve of this.curveArray) {
			curve.draw(this);
		}
		// draw labels, plot, everything here.
		// basically call the curves' drawing functions
	}

}


class Plot3D extends Plot {

	/*
	The base class for all types of 3D plots.
	*/

}


class ContinuousUpdatePlot2D extends Plot2D {

	/*
	DataPlot2D that constantly drops data off the back and takes new data at the front, retaining a certain number of data points
	*/

}


class Curve {

}


class Curve2D extends Curve {

	/*
	curve class
	@param {array of numbers} xData: The x coordinates of all data. Must be the same length as yData
	@param {array of numbers} yData: The y coordinates of all data. Must be the same length as xData
	@param {p5 color object} curveColor: The color of the curve
	@param {int} curveWeight: The thickness of the curve
	@param {string} dataStyle: "continuous" - connect data in a smooth line, "discrete" - plot data as points, "both" - plot points and draw lines between

	MUST HAVE:
	- method: getMinX(), getMaxX(), getMinY(), getMaxY()
	*/
	constructor(xData, yData, curveColor=color(255, 100, 100), curveWeight=1, dataStyle="continuous") {
		super();
		this.curveStyle = {};
		this.setData(xData, yData);
		this.setCurveColor(curveColor);
		this.setCurveWeight(curveWeight);
		this.setDataStyle(dataStyle);
	}

	getData() {
		return this.data;
	}

	getXMin() {
		return this.xMin;
	}

	getXMax() {
		return this.xMax;
	}

	getYMin() {
		return this.yMin;
	}

	getYMax() {
		return this.yMax;
	}

	getDataStyle() {
		return this.curveStyle.dataStyle;
	}

	getCurveColor() {
		return this.curveStyle.curveColor;
	}

	getCurveWeight() {
		return this.curveStyle.curveWeight;
	}

	setCurveColor(curveColor) {
		this.curveStyle.curveColor = curveColor;
	}

	setCurveWeight(curveWeight) {
		this.curveStyle.curveWeight = curveWeight;
	}

	setDataStyle(dataStyle) {
		this.curveStyle.dataStyle = dataStyle;
	}

	/* Not to be called by users */
	setXMin(xMin) {
		this.xMin = xMin;
	}

	/* Not to be called by users */
	setXMax(xMax) {
		this.xMax = xMax;
	}

	/* Not to be called by users */
	setYMin(yMin) {
		this.yMin = yMin;
	}

	/* Not to be called by users */
	setYMax(yMax) {
		this.yMax = yMax;
	}

	/* Not to be called by users. Sets xMin, xMax, yMin, yMax */
	setExtremes(xMin, xMax, yMin, yMax) {
		this.setXMin(xMin);
		this.setXMax(xMax);
		this.setYMin(yMin);
		this.setYMax(yMax);
	}

	setData(xData, yData) {
		if (xData.length !== yData.length) throw new Error("xData and yData must be the same length.");

		this.data = [];
		let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, x, y;
		for (let i=0; i<xData.length; i++) {
			x = xData[i];
			y = yData[i];
			if (x < xMin) xMin = x;
			if (x > xMax) xMax = x;
			if (y < yMin) yMin = y;
			if (y > yMax) yMax = y;

			this.data.push(createVector(x, y));
		}
		this.setExtremes(xMin, xMax, yMin, yMax);
	}

	/*
	Draw the curve to the surface of the passed Plot.
	@param {Plot2D or subclass} plot2d: The target Plot
	*/
	draw(plot2d) {
		const data = this.getData();
		let lastPoint = null, P;

		push();
		plot2d.surface.stroke(this.getCurveColor());
		plot2d.surface.strokeWeight(this.getCurveWeight());
		for (let i=0; i<data.length; i++) {
			P = data[i];
			if (this.getDataStyle() !== "continuous") { // discrete or both
				// draw a point here, but do this later
			}
			if (this.getDataStyle() !== "discrete") { // continuous or both
				if (lastPoint !== null) plot2d.drawLine(lastPoint, P);
				lastPoint = P;
			}
		}
		pop();
	}

}


//\ ------------------------------------------------------------------------------------------------------------------ /\\


/* Testing:
let win, plot1, plot2, xData, curves;
function setup() {
	canvas = createCanvas(windowWidth, windowHeight);
	canvas.parent("canvas-div");

	win = new PlotWindow(0, 0, 400, 400, 1, 2);
	plot1 = win.setPlot(new Plot2D(), 0, 0);
	plot2 = win.setPlot(new Plot2D(), 0, 1);

	xData = []; curves = [];
	xData[0] = linearSpace(-3, 3);
	xData[1] = linearSpace(-3, 3);
	xData[2] = linearSpace(-1, 1);
	xData[3] = linearSpace(-2, 2);

	curves[0] = plot1.plot(new Curve2D(xData[0], xData[0].map(sin) ));
	curves[1] = plot1.plot(new Curve2D(xData[1], xData[1].map(cos) ));
	curves[2] = plot2.plot(new Curve2D(xData[2], xData[2].map(sin) ));
	curves[3] = plot2.plot(new Curve2D(xData[3], xData[3].map(cos) ));

	curves[1].setCurveColor(color(0, 0, 255));
	curves[3].setCurveColor(color(0, 0, 255));
}

function draw() {
	win.draw();
}
*/
