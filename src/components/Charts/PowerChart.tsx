import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TimeSeriesPoint } from '../../sim';

interface PowerChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
}

export const PowerChart: React.FC<PowerChartProps> = ({ data, width = 400, height = 200 }) => {
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

    const maxY = d3.max(data, d => Math.max(d.totalPowerMW, d.totalGridCapacityMW)) || 100;
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
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d} MW`));

    // Area for capacity (filled)
    const capacityArea = d3.area<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y0(innerHeight)
      .y1(d => yScale(d.totalGridCapacityMW))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'rgba(148, 163, 184, 0.2)')
      .attr('d', capacityArea);

    // Line generators
    const powerLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScale(d.totalPowerMW))
      .curve(d3.curveMonotoneX);

    const capacityLine = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.tick))
      .y(d => yScale(d.totalGridCapacityMW))
      .curve(d3.curveMonotoneX);

    // Draw lines
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', powerLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', capacityLine);

    // Warning zone - where power exceeds 80% of capacity
    const lastPoint = data[data.length - 1];
    if (lastPoint.totalPowerMW > lastPoint.totalGridCapacityMW * 0.8) {
      const warningY = yScale(lastPoint.totalGridCapacityMW * 0.8);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', warningY)
        .attr('y2', warningY)
        .attr('stroke', '#eab308')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.5);
    }

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 100}, 0)`);

    const legendItems = [
      { label: 'Facility Power', color: '#3b82f6', dashed: false },
      { label: 'Grid Capacity', color: '#94a3b8', dashed: true },
    ];

    legendItems.forEach((item, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 15})`);
      row.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.dashed ? '3,3' : '0');
      row.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(item.label);
    });

  }, [data, width, height]);

  return (
    <div className="chart-container" id="power-chart">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};
