const svg = d3.select("svg");
const margin = { top: 20, right: 30, bottom: 30, left: 40 };
const width = svg.attr("width") - margin.left - margin.right;
const height = svg.attr("height") - margin.top - margin.bottom;
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().range([0, width]).domain([-4, 4]);
const y = d3.scaleLinear().range([height, 0]).domain([0, 0.5]);

const line = d3.line()
  .x(d => x(d.x))
  .y(d => y(d.y));

const area = d3.area()
  .x(d => x(d.x))
  .y0(height)
  .y1(d => y(d.y));

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const normalDistribution = (z) => {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
};

const cumulativeNormalDistribution = (z) => {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
};
/**
 * Approximates the error function (erf) for a given value x.
 * The error function is used in probability, statistics, and partial differential equations
 * to calculate probabilities and integrate the normal distribution.
 * This implementation uses the Abramowitz and Stegun approximation for computational efficiency.
 *
 * @param {number} x - The input value for which to compute the error function.
 * @return {number} - The approximate value of erf(x).
 */
const erf = (x) => {
    // Determine the sign of the input.
  // The error function is odd, so erf(-x) = -erf(x).
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
// Constants for the Abramowitz and Stegun approximation.
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
// Calculate t.
  // t is used in the polynomial approximation formula for erf.
  const t = 1.0 / (1.0 + p * x);
  // Polynomial approximation for erf.
  // This formula approximates the integral of the Gaussian distribution.
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
// Return the result adjusted by the sign of the input.
  // This ensures that erf(-x) = -erf(x).
  return sign * y;
};

const updateDistribution = () => {
    const alpha = +d3.select("#alpha").property("value");
    const tail = d3.select('input[name="tail"]:checked').node().value;
  
    const data = d3.range(-4, 4, 0.01).map(z => ({
      x: z,
      y: normalDistribution(z)
    }));
  
    g.selectAll("*").remove();
  
    // Draw the entire line for the normal distribution
    g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);
  
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y));
  
    // Calculate critical values for the rejection areas
    let zCritical, zCriticalLeft;
    if (tail === "two") {
      zCritical = jStat.normal.inv(1 - alpha / 2, 0, 1);
      zCriticalLeft = -zCritical;
    } else if (tail === "left") {
      zCriticalLeft = jStat.normal.inv(alpha, 0, 1);
      zCritical = 4; // To ensure the line is not drawn on the right
    } else {
      zCritical = jStat.normal.inv(1 - alpha, 0, 1);
      zCriticalLeft = -4; // To ensure the line is not drawn on the left
    }
  
    // Append critical value lines
    if (tail === "two") {
      g.append("line")
        .attr("class", "critical-line")
        .attr("x1", x(zCriticalLeft))
        .attr("x2", x(zCriticalLeft))
        .attr("y1", 0)
        .attr("y2", height);
      g.append("line")
        .attr("class", "critical-line")
        .attr("x1", x(zCritical))
        .attr("x2", x(zCritical))
        .attr("y1", 0)
        .attr("y2", height);
  
      // Color the rejection areas
      g.append("path")
        .datum(data.filter(d => d.x <= zCriticalLeft))
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "red")
        .attr("opacity", 0.5);
      g.append("path")
        .datum(data.filter(d => d.x >= zCritical))
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "red")
        .attr("opacity", 0.5);
    } else if (tail === "left") {
      g.append("line")
        .attr("class", "critical-line")
        .attr("x1", x(zCriticalLeft))
        .attr("x2", x(zCriticalLeft))
        .attr("y1", 0)
        .attr("y2", height);
  
      // Color the rejection area
      g.append("path")
        .datum(data.filter(d => d.x <= zCriticalLeft))
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "red")
        .attr("opacity", 0.5);
    } else {
      g.append("line")
        .attr("class", "critical-line")
        .attr("x1", x(zCritical))
        .attr("x2", x(zCritical))
        .attr("y1", 0)
        .attr("y2", height);
  
      // Color the rejection area
      g.append("path")
        .datum(data.filter(d => d.x >= zCritical))
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "red")
        .attr("opacity", 0.5);
    }
  
    const verticalLine = g.append("line")
      .attr("class", "dotted-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("display", "none");
  
    svg.on("mousemove", function(event) {
      const [mouseX] = d3.pointer(event, this);
      const mouseZ = x.invert(mouseX - margin.left);
      let pValue;
  
      if (tail === "two") {
        pValue = 2 * (1 - cumulativeNormalDistribution(Math.abs(mouseZ)));
      } else if (tail === "left") {
        pValue = cumulativeNormalDistribution(mouseZ);
      } else {
        pValue = 1 - cumulativeNormalDistribution(mouseZ);
      }
  
      verticalLine.attr("x1", mouseX - margin.left)
        .attr("x2", mouseX - margin.left)
        .attr("display", "inline");
  
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Z: ${mouseZ.toFixed(2)}<br>P: ${pValue.toFixed(4)}`)
        .style("left", `${event.pageX + 20}px`)
        .style("top", `${event.pageY - 28}px`);
    });
  
    svg.on("mouseleave", () => {
      tooltip.transition().duration(500).style("opacity", 0);
      verticalLine.attr("display", "none");
    });
  };
  
  updateDistribution();
  
  d3.select("#alpha").on("input", function() {
    d3.select("#alphaValue").text(this.value);
    updateDistribution();
  });
  
  d3.selectAll('input[name="tail"]').on("change", updateDistribution);
  