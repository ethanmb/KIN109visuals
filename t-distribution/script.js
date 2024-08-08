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
let currentDf = 1; // Current degrees of freedom
let intervalId; // Store the interval ID

function updateChart(df) {
    const tData = d3.range(-5, 5.1, 0.1).map(x => ({ x: x, y: tDist(x, df) }));
    const normalData = d3.range(-5, 5.1, 0.1).map(x => ({ x: x, y: normalDist(x) }));

    const tPath = svg.selectAll(".t-line")
        .data([tData]);

    tPath.enter().append("path")
        .attr("class", "t-line")
        .style("stroke", "blue")
        .style("stroke-width", 2) // Thicker t-distribution line
        .style("fill", "none")
        .merge(tPath)
        .transition()
        .duration(500) // Duration for smooth transition
        .attr("d", tLine);

    tPath.exit().remove();

    const normalPath = svg.selectAll(".normal-line")
        .data([normalData]);

    normalPath.enter().append("path")
        .attr("class", "normal-line")
        .style("stroke", "black")
        .style("stroke-dasharray", ("3, 3"))
        .style("stroke-width", 2) // Thicker normal distribution line
        .style("fill", "none")
        .merge(normalPath)
        .attr("d", normalLine);

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
    const targetDf = +this.value;
    sliderValue.text(targetDf);
});

slider.on("change", function() {
    const targetDf = +this.value;
    const totalTransitionTime = 50; // Total transition time in milliseconds
    const steps = Math.abs(targetDf - currentDf);
    const intervalDuration = steps > 0 ? totalTransitionTime / steps : totalTransitionTime;

    if (intervalId) clearInterval(intervalId); // Clear any existing interval

    const step = targetDf > currentDf ? 1 : -1;
    intervalId = setInterval(() => {
        if (currentDf !== targetDf) {
            currentDf += step;
            updateChart(currentDf);
            sliderValue.text(currentDf); // Update displayed degrees of freedom
        } else {
            clearInterval(intervalId);
        }
    }, intervalDuration);
});

updateChart(currentDf);
