import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TimeSeriesPoint } from '../../sim';

interface CarbonChartProps {
  data: TimeSeriesPoint[];
  carbonBudget: number;
  width?: number;
  height?: number;
}

export const CarbonChart: React.FC<CarbonChartProps> = ({ 
  data, 
  carbonBudget,
  width = 400, 
  height = 150 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 60, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([data[0].tick, data[data.length - 1].tick])
      .range([0, innerWidth]);

    const maxEmissions = Math.max(
      d3.max(data, d => d.cumulativeEmissions) || 0,
      carbonBudget
    );
    
    const yScaleEmissions = d3
      .scaleLinear()
      .domain([0, maxEmissions * 1.1])
      .range([innerHeight, 0]);

    const maxIntensity = d3.max(data, d => d.avgCarbonIntensity) || 500;
    const yScaleIntensity = d3
      .scaleLinear()
      .domain([0, maxIntensity * 1.2])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3.axisLeft(yScaleEmissions)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('color', '#64748b')
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `W${d}`));

    g.append('g')
      .attr('color', '#a855f7')
      .call(d3.axisLeft(yScaleEmissions).ticks(4).tickFormat(d => `${d}t`));

    g.append('g')
      .attr('transform', `translate(${innerWidth}, 0)`)
      .attr('color', '#06b6d4')
      .call(d3.axisRight(yScaleIntensity).ticks(4).tickFormat(d => `${d}`));

    // Carbon budget line
    const budgetY = yScaleEmissions(carbonBudget);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', budgetY)
      .attr('y2', budgetY)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', budgetY - 5)
      .attr('fill', '#ef4444')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .text('Cap');

    // Area for cumulative emissions
    const emissionsArea = d3.area<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y0(innerHeight)
      .y1(d => yScaleEmissions(d.cumulativeEmissions))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'rgba(168, 85, 247, 0.3)')
      .attr('d', emissionsArea);

    // Cumulative emissions line
    const emissionsLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScaleEmissions(d.cumulativeEmissions))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 2)
      .attr('d', emissionsLine);

    // Carbon intensity line (secondary axis)
    const intensityLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScaleIntensity(d.avgCarbonIntensity))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('d', intensityLine);

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(0, -5)`);

    legend.append('line')
      .attr('x1', 0).attr('x2', 15)
      .attr('stroke', '#a855f7').attr('stroke-width', 2);
    legend.append('text')
      .attr('x', 20).attr('y', 4)
      .attr('fill', '#94a3b8').attr('font-size', '9px')
      .text('Emissions');

    legend.append('line')
      .attr('x1', 80).attr('x2', 95)
      .attr('stroke', '#06b6d4').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');
    legend.append('text')
      .attr('x', 100).attr('y', 4)
      .attr('fill', '#94a3b8').attr('font-size', '9px')
      .text('Intensity (kg/MWh)');

  }, [data, carbonBudget, width, height]);

  return (
    <div className="chart-container" id="carbon-chart">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};
