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

/*
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
	- method: updateState NOT update. look at the Plot class when making this one
*/

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
		return this.config.general.yAxisColor;
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

	onDimensionSet() {
		this.hasDimensionsSet = true;
		this.setOrigin(this.originX, this.originY);
		this.calculateBounds(this.xMin, this.xMax, this.yMin, this.yMax);
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
			// calculate scaling. account for origin
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


class Curve2D {

	/*
	curve class
	*/
	constructor() {

	}

}


//\ ------------------------------------------------------------------------------------------------------------------ /\\

let win;
function setup() {
	canvas = createCanvas(windowWidth, windowHeight);
	canvas.parent("canvas-div");

	win = new PlotWindow(0, 0, 400, 400, 1, 1);
	win.setPlot(new Plot(), 0, 0);
}

function draw() {
	win.draw();
}
