import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TimeSeriesPoint } from '../../sim';

interface DemandChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
}

export const DemandChart: React.FC<DemandChartProps> = ({ data, width = 400, height = 200 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
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

    const maxY = d3.max(data, d => Math.max(d.demand, d.served, d.backlog)) || 100;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxY * 1.1])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('color', '#64748b')
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `W${d}`));

    g.append('g')
      .attr('color', '#64748b')
      .call(d3.axisLeft(yScale).ticks(5));

    // Line generators
    const demandLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScale(d.demand))
      .curve(d3.curveMonotoneX);

    const servedLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScale(d.served))
      .curve(d3.curveMonotoneX);

    const backlogLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScale(d.backlog))
      .curve(d3.curveMonotoneX);

    // Draw lines
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f472b6')
      .attr('stroke-width', 2)
      .attr('d', demandLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('d', servedLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('d', backlogLine);

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 80}, 0)`);

    const legendItems = [
      { label: 'Demand', color: '#f472b6' },
      { label: 'Served', color: '#22c55e' },
      { label: 'Backlog', color: '#ef4444' },
    ];

    legendItems.forEach((item, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 15})`);
      row.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('stroke', item.color)
        .attr('stroke-width', 2);
      row.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(item.label);
    });

  }, [data, width, height]);

  return (
    <div className="chart-container" id="demand-chart">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};
