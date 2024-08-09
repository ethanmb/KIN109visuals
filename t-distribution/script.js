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

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

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

function calculateProbabilities(zScore, df) {
    const tProb = jStat.studentt.cdf(zScore, df);
    const normalProb = jStat.normal.cdf(zScore, 0, 1);
    return { tProb, normalProb };
}

function updateProbabilityDisplay(zScore, df) {
    const { tProb, normalProb } = calculateProbabilities(zScore, df);

    d3.selectAll("#currentZScoreText").text(zScore.toFixed(3));
    d3.select("#tDistProb").text(tProb.toFixed(3));
    d3.select("#normalDistProb").text(normalProb.toFixed(3));

    d3.select("#tDistBar").style("width", `${tProb * 100}%`);
    d3.select("#normalDistBar").style("width", `${normalProb * 100}%`);
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
        updateProbabilityDisplay(newZ, df); // Update probabilities
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
const tooltip = d3.select("#sliderTooltip");

slider.on("input", function() {
    const dummyDf = +this.value;
    const sliderPosition = this.valueAsNumber / this.max * this.clientWidth;

    // Update tooltip position and value
    tooltip.style("visibility", "visible")
        .style("left", `${sliderPosition}px`)
        .text(dummyDf);
});

slider.on("change", function() {
    const targetDf = +this.value;
    tooltip.style("visibility", "hidden"); // Hide the tooltip after release

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
            updateProbabilityDisplay(currentZScore, currentDf); // Update probabilities
        } else {
            clearInterval(intervalId);
        }
    }, intervalDuration);
});

updateChart(currentDf);
updateProbabilityDisplay(currentZScore, currentDf); // Initialize probabilities
