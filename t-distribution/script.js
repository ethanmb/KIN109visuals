// script.js

const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Adding a transparent rectangle to capture all mouse events
svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

const x = d3.scaleLinear().domain([-5, 5]).range([0, width]);
const y = d3.scaleLinear().domain([0, 0.4]).range([height, 0]);

const xAxis = d3.axisBottom(x);
const yAxis = d3.axisLeft(y);

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

const tLine = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

const normalLine = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

function tDist(x, df) {
    return jStat.studentt.pdf(x, df);
}

function normalDist(x) {
    return jStat.normal.pdf(x, 0, 1);
}

let currentZScore = -1.644; // Initialize with -1.644

function updateChart(df) {
    const tData = d3.range(-5, 5.1, 0.1).map(x => ({ x: x, y: tDist(x, df) }));
    const normalData = d3.range(-5, 5.1, 0.1).map(x => ({ x: x, y: normalDist(x) }));

    const tPath = svg.selectAll(".t-line")
        .data([tData]);

    tPath.enter().append("path")
        .attr("class", "t-line")
        .merge(tPath)
        .transition()
        .duration(1000)
        .attr("d", tLine)
        .style("stroke", "blue")
        .style("fill", "none");

    tPath.exit().remove();

    const normalPath = svg.selectAll(".normal-line")
        .data([normalData]);

    normalPath.enter().append("path")
        .attr("class", "normal-line")
        .merge(normalPath)
        .transition()
        .duration(1000)
        .attr("d", normalLine)
        .style("stroke", "black")
        .style("stroke-dasharray", ("3, 3"))
        .style("fill", "none");

    normalPath.exit().remove();

    // Call to draw the draggable line and area fill with the current z-score
    drawLineAndFill(currentZScore, df);
}

function drawLineAndFill(zScore, df) {
    svg.selectAll(".area").remove();
    svg.selectAll(".line").remove();

    const tAreaData = d3.range(-5, zScore, 0.1).map(x => ({ x: x, y: tDist(x, df) }));
    const normalAreaData = d3.range(-5, zScore, 0.1).map(x => ({ x: x, y: normalDist(x) }));

    svg.append("path")
        .datum(tAreaData)
        .attr("class", "area")
        .attr("d", d3.area()
            .x(d => x(d.x))
            .y0(height)
            .y1(d => y(d.y))
        )
        .style("fill", "lightblue")
        .style("opacity", 0.5);

    svg.append("path")
        .datum(normalAreaData)
        .attr("class", "area")
        .attr("d", d3.area()
            .x(d => x(d.x))
            .y0(height)
            .y1(d => y(d.y))
        )
        .style("fill", "lightblue")
        .style("opacity", 0.5);

    const line = svg.append("line")
        .attr("class", "line")
        .attr("x1", x(zScore))
        .attr("x2", x(zScore))
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "black")
        .style("stroke-width", 2);

    const drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    svg.call(drag);

    function dragstarted(event) {
        const mouseX = d3.pointer(event, svg.node())[0];
        updateLineAndFill(mouseX);
    }

    function dragged(event) {
        const mouseX = d3.pointer(event, svg.node())[0];
        updateLineAndFill(mouseX);
    }

    function dragended(event) {
        const mouseX = d3.pointer(event, svg.node())[0];
        updateLineAndFill(mouseX);
    }

    function updateLineAndFill(mouseX) {
        const newX = Math.max(Math.min(mouseX, x(5)), x(-5));
        const newZ = x.invert(newX);
        currentZScore = newZ; // Update the current z-score
        line.attr("x1", newX).attr("x2", newX);
        drawAreaFill(newZ, df);
    }

    function drawAreaFill(newZ, df) {
        const tAreaData = d3.range(-5, newZ, 0.1).map(x => ({ x: x, y: tDist(x, df) }));
        const normalAreaData = d3.range(-5, newZ, 0.1).map(x => ({ x: x, y: normalDist(x) }));

        svg.selectAll(".area").remove();

        svg.append("path")
            .datum(tAreaData)
            .attr("class", "area")
            .attr("d", d3.area()
                .x(d => x(d.x))
                .y0(height)
                .y1(d => y(d.y))
            )
            .style("fill", "lightblue")
            .style("opacity", 0.5);

        svg.append("path")
            .datum(normalAreaData)
            .attr("class", "area")
            .attr("d", d3.area()
                .x(d => x(d.x))
                .y0(height)
                .y1(d => y(d.y))
            )
            .style("fill", "lightblue")
            .style("opacity", 0.5);
    }
}

const slider = d3.select("#degreesOfFreedomSlider");
const sliderValue = d3.select("#degreesOfFreedomValue");

slider.on("input", function() {
    const df = +this.value;
    sliderValue.text(df);
});

slider.on("change", function() {
    const df = +this.value;
    updateChart(df);
});

updateChart(1);
